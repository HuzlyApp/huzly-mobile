import { supabase } from '@/lib/config/supabase';

export type ReplaceWorkerResumeResult = {
  path: string | null;
  error: string | null;
};

/**
 * Replaces the worker's resume in Supabase Storage so each worker has at most one resume.
 *
 * Bucket: "worker-onboarding"
 * Folder: "resume/<workerId>/resume.pdf"
 *
 * Behavior:
 * - Deletes any existing files under "resume/<workerId>/"
 * - Uploads the new file as "resume.pdf"
 */
export async function replaceWorkerResumeInStorage(params: {
  userId: string;
  file: { uri: string; name?: string | null; mimeType?: string | null };
}): Promise<ReplaceWorkerResumeResult> {
  const bucket = 'worker-onboarding';
  const folder = `resume/${params.userId}`;
  const targetPath = `${folder}/resume.pdf`;

  try {
    // Remove existing files for this worker (best-effort)
    const { data: existing, error: listError } = await supabase.storage.from(bucket).list(folder, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (listError) {
      return { path: null, error: listError.message };
    }

    const toRemove =
      existing?.map((o) => `${folder}/${o.name}`).filter((p) => p !== targetPath) ?? [];

    if (toRemove.length > 0) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(toRemove);
      if (removeError) {
        return { path: null, error: removeError.message };
      }
    }

    // Upload new file (overwrite fixed key)
    const res = await fetch(params.file.uri);
    const arrayBuffer = await res.arrayBuffer();

    const contentType = params.file.mimeType ?? 'application/pdf';
    const { error: uploadError } = await supabase.storage.from(bucket).upload(targetPath, arrayBuffer, {
      upsert: true,
      contentType,
    });

    if (uploadError) {
      return { path: null, error: uploadError.message };
    }

    return { path: targetPath, error: null };
  } catch (e: any) {
    return { path: null, error: e?.message ?? 'Failed to upload resume' };
  }
}

