import { apiClient } from '@/lib/config/axios';
import type { ResumeReviewData } from '@/stores/RequirementsUploadContext';

export type ParseResumeResult = {
  data: ResumeReviewData;
  error: string | null;
};

export async function parseResumeWithGrok(params: {
  bucket: string;
  path: string;
}): Promise<ParseResumeResult> {
  try {
    const response = await apiClient.post(
      '/api/resume-parse',
      { bucket: params.bucket, path: params.path },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return { data: (response.data as ResumeReviewData) ?? null, error: null };
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(e);
    return { data: null, error: e?.message ?? 'Failed to parse resume' };
  }
}