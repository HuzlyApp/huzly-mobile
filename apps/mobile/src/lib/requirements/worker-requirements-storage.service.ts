import type { RequirementId } from '@/constants/requirements';
import { supabase } from '@/lib/config/supabase';

export type UploadRequirementFileResult = {
  path: string | null;
  error: string | null;
};

export type ClearRequirementFileResult = {
  error: string | null;
};

type RequirementStorageMapping = {
  bucket: string;
  // Folder prefix inside the bucket (not including filename).
  storageFolder: string;
  dbColumn: string;
};

const BUCKET = 'worker_required_files';

function getRequirementMapping(requirementId: RequirementId): RequirementStorageMapping {
  // Matches your requested bucket layout.
  //
  // Example you gave:
  //   /worker_required_files/drivers_license/datenow-ivan.png
  //
  // In Supabase terms:
  //   bucket = "worker_required_files"
  //   object key = "drivers_license/datenow-ivan.png"
  switch (requirementId) {
    case 'drivers_license':
      return {
        bucket: BUCKET,
        storageFolder: 'drivers_license',
        dbColumn: 'drivers_license_path',
      };
    case 'certification':
      return {
        bucket: BUCKET,
        storageFolder: 'huzzly/certification',
        dbColumn: 'job_certificate_path',
      };
    case 'drug_test':
      return {
        bucket: BUCKET,
        storageFolder: 'huzzly/drug_test_result_license',
        dbColumn: 'drug_test_results_path',
      };
    case 'w9':
      return {
        bucket: BUCKET,
        storageFolder: 'huzzly/w9',
        dbColumn: 'w9_path',
      };
    default: {
      // Exhaustiveness guard
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unsupported requirement id: ${String(requirementId)}`);
    }
  }
}

function inferContentType(file: { mimeType?: string | null; name?: string | null }): string {
  if (file.mimeType) return file.mimeType;
  const name = file.name ?? '';
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

function getFileExtension(file: { mimeType?: string | null; name?: string | null }): string {
  const name = file.name ?? '';
  const lower = name.toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx >= 0 && dotIdx < lower.length - 1) {
    const ext = lower.slice(dotIdx + 1).trim();
    if (ext) return ext;
  }

  const mime = file.mimeType ?? '';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('pdf')) return 'pdf';
  return 'bin';
}

function slugify(input: string): string {
  // Keep ASCII, collapse whitespace, replace unsafe characters.
  return (input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
}

function formatNowSecondsForFilename(now: Date): string {
  // Unix epoch seconds to keep filenames short and unique enough.
  return String(Math.floor(now.getTime() / 1000));
}

function buildRequirementFilename(file: { name?: string | null; mimeType?: string | null }): string {
  const ext = getFileExtension(file);
  const baseName = (file.name ?? '').replace(/\.[^/.]+$/, '');
  const safeBase = slugify(baseName) || 'file';
  // Your example uses `datenow-<name>.<ext>` where `datenow` is the current datetime.
  const nowToken = formatNowSecondsForFilename(new Date());
  return `${nowToken}-${safeBase}.${ext}`;
}

function dbPathToStorageKey(dbPath: string, bucket: string): string | null {
  const normalized = dbPath.trim().replace(/^\/*/, ''); // remove leading slashes
  const prefix = `${bucket}/`;
  if (!normalized.startsWith(prefix)) return null;
  return normalized.slice(prefix.length);
}

async function getExistingRequirementPath(params: { userId: string; dbColumn: string }): Promise<string | null> {
  const { data, error } = await supabase
    .from('worker_requirements')
    .select(params.dbColumn)
    .eq('worker_id', params.userId)
    .maybeSingle();

  if (error) return null;
  const row = data as Record<string, unknown> | null;
  const value = row?.[params.dbColumn];
  return typeof value === 'string' ? value : null;
}

export async function uploadWorkerRequirementFileToStorageAndDb(params: {
  userId: string; // auth.users.id (see worker_requirements.worker_id FK)
  requirementId: RequirementId;
  file: { uri: string; name?: string | null; mimeType?: string | null };
}): Promise<UploadRequirementFileResult> {
  const mapping = getRequirementMapping(params.requirementId);
  const filename = buildRequirementFilename(params.file);
  const storageKey = `${mapping.storageFolder}/${filename}`;
  const dbValue = `/${mapping.bucket}/${storageKey}`;
  const contentType = inferContentType(params.file);

  try {
    // If re-uploading, delete the currently stored object (best-effort).
    const existingDbPath = await getExistingRequirementPath({
      userId: params.userId,
      dbColumn: mapping.dbColumn,
    });

    if (existingDbPath) {
      const existingStorageKey = dbPathToStorageKey(existingDbPath, mapping.bucket);
      if (existingStorageKey) {
        await supabase.storage.from(mapping.bucket).remove([existingStorageKey]);
      }
    }

    const res = await fetch(params.file.uri);
    const arrayBuffer = await res.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(mapping.bucket)
      .upload(storageKey, arrayBuffer, {
        upsert: false,
        contentType,
      });

    if (uploadError) {
      return { path: null, error: uploadError.message };
    }

    const payload: Record<string, string | null> = {
      worker_id: params.userId,
      [mapping.dbColumn]: dbValue,
    };

    const { error: upsertError } = await supabase
      .from('worker_requirements')
      .upsert(payload, { onConflict: 'worker_id' });

    if (upsertError) {
      return { path: null, error: upsertError.message };
    }

    return { path: dbValue, error: null };
  } catch (e: any) {
    return { path: null, error: e?.message ?? 'Failed to upload requirement file' };
  }
}

export async function clearWorkerRequirementFileFromStorageAndDb(params: {
  userId: string; // auth.users.id
  requirementId: RequirementId;
}): Promise<ClearRequirementFileResult> {
  const mapping = getRequirementMapping(params.requirementId);

  try {
    // Remove the exact object currently referenced in DB.
    const existingDbPath = await getExistingRequirementPath({
      userId: params.userId,
      dbColumn: mapping.dbColumn,
    });

    if (existingDbPath) {
      const existingStorageKey = dbPathToStorageKey(existingDbPath, mapping.bucket);
      if (existingStorageKey) {
        await supabase.storage.from(mapping.bucket).remove([existingStorageKey]);
      }
    }

    const payload: Record<string, string | null> = {
      worker_id: params.userId,
      [mapping.dbColumn]: null,
    };

    const { error: upsertError } = await supabase
      .from('worker_requirements')
      .upsert(payload, { onConflict: 'worker_id' });

    if (upsertError) {
      return { error: upsertError.message };
    }

    return { error: null };
  } catch (e: any) {
    return { error: e?.message ?? 'Failed to clear requirement file' };
  }
}

