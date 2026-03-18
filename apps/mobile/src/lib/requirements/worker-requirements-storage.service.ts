import { supabase } from '@/lib/config/supabase';
import type { RequirementId } from '@/constants/requirements';

export type UploadRequirementFileResult = {
  path: string | null;
  error: string | null;
};

export type ClearRequirementFileResult = {
  error: string | null;
};

type RequirementStorageMapping = {
  bucket: string;
  storagePath: (userId: string) => string;
  dbColumn: string;
};

const BUCKET = 'worker_required_files';

function getRequirementMapping(requirementId: RequirementId): RequirementStorageMapping {
  // Storage paths are deterministic so we can safely overwrite on re-upload.
  // Note: user instruction mentions "worker_required_files/huzzly/<...>".
  // We still include `userId` to avoid collisions between different workers.
  switch (requirementId) {
    case 'drivers_license':
      return {
        bucket: BUCKET,
        storagePath: (userId) => `huzzly/${userId}/drivers_license`,
        dbColumn: 'drivers_license_path',
      };
    case 'certification':
      return {
        bucket: BUCKET,
        storagePath: (userId) => `huzzly/${userId}/certification`,
        dbColumn: 'job_certificate_path',
      };
    case 'drug_test':
      return {
        bucket: BUCKET,
        storagePath: (userId) => `huzzly/${userId}/drug_test_result_license`,
        dbColumn: 'drug_test_results_path',
      };
    case 'w9':
      return {
        bucket: BUCKET,
        storagePath: (userId) => `huzzly/${userId}/w9`,
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

export async function uploadWorkerRequirementFileToStorageAndDb(params: {
  userId: string; // auth.users.id (see worker_requirements.worker_id FK)
  requirementId: RequirementId;
  file: { uri: string; name?: string | null; mimeType?: string | null };
}): Promise<UploadRequirementFileResult> {
  const mapping = getRequirementMapping(params.requirementId);
  const targetPath = mapping.storagePath(params.userId);
  const contentType = inferContentType(params.file);

  try {
    const res = await fetch(params.file.uri);
    const arrayBuffer = await res.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(mapping.bucket)
      .upload(targetPath, arrayBuffer, {
        upsert: true,
        contentType,
      });

    if (uploadError) {
      return { path: null, error: uploadError.message };
    }

    const payload: Record<string, string | null> = {
      worker_id: params.userId,
      [mapping.dbColumn]: targetPath,
    };

    const { error: upsertError } = await supabase
      .from('worker_requirements')
      .upsert(payload, { onConflict: 'worker_id' });

    if (upsertError) {
      return { path: null, error: upsertError.message };
    }

    return { path: targetPath, error: null };
  } catch (e: any) {
    return { path: null, error: e?.message ?? 'Failed to upload requirement file' };
  }
}

export async function clearWorkerRequirementFileFromStorageAndDb(params: {
  userId: string; // auth.users.id
  requirementId: RequirementId;
}): Promise<ClearRequirementFileResult> {
  const mapping = getRequirementMapping(params.requirementId);
  const targetPath = mapping.storagePath(params.userId);

  try {
    // Storage delete is best-effort; if the file doesn't exist that's OK.
    await supabase.storage.from(mapping.bucket).remove([targetPath]);

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

