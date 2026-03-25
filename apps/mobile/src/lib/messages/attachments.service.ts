import { supabase } from '@/lib/config/supabase';
import { env } from '@/lib/config/env';

export type MessageAttachment = {
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
};

export type FileLike = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

const BUCKET = 'message-files';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
] as const;

export function validateAttachment(file: FileLike): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Unsupported file type. Allowed: PDF, DOCX, XLSX, JPG, PNG.';
  }

  if (file.size > MAX_SIZE_BYTES) {
    return 'File is too large. Maximum size is 5MB.';
  }

  return null;
}

async function compressFileViaEdge(
  bucket: string,
  path: string,
): Promise<{ signedUrl: string | null; compressed: boolean; compressedSize?: number }> {
  try {
    const functionUrl = `${env.supabaseUrl}/functions/v1/compress-file`;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken ?? env.supabaseAnonKey}`,
      },
      body: JSON.stringify({ bucket, path, quality: 60 }),
    });

    if (!response.ok) {
      console.warn('Compression edge function failed:', response.status);
      return { signedUrl: null, compressed: false };
    }

    const result = await response.json();
    console.log('Compression result:', result);

    if (result.compressed && result.signedUrl) {
      return { signedUrl: result.signedUrl, compressed: true, compressedSize: result.compressedSize };
    }

    return { signedUrl: result.signedUrl ?? null, compressed: false };
  } catch (err) {
    console.warn('Compression edge function error:', err);
    return { signedUrl: null, compressed: false };
  }
}

export async function uploadMessageAttachment(
  file: FileLike,
  userId: string,
): Promise<{ attachment: MessageAttachment | null; error: string | null }> {
  try {
    const validationError = validateAttachment(file);
    if (validationError) {
      return { attachment: null, error: validationError };
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `message_attachments/${userId}_${timestamp}_${safeName}`;

    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return { attachment: null, error: uploadError.message };
    }

    const isImage = file.mimeType.startsWith('image/');
    let finalUrl: string | null = null;
    let finalSize = file.size;

    if (isImage) {
      const compressed = await compressFileViaEdge(BUCKET, path);
      if (compressed.signedUrl) {
        finalUrl = compressed.signedUrl;
      }
      if (compressed.compressedSize) {
        finalSize = compressed.compressedSize;
      }
    }

    if (!finalUrl) {
      const { data: signed, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      if (signedError || !signed?.signedUrl) {
        return { attachment: null, error: signedError?.message ?? 'Failed to generate file URL.' };
      }

      finalUrl = signed.signedUrl;
    }

    const attachment: MessageAttachment = {
      fileName: file.name,
      fileType: file.mimeType,
      fileUrl: finalUrl,
      fileSize: finalSize,
    };

    return { attachment, error: null };
  } catch (error: any) {
    return { attachment: null, error: error?.message ?? 'Failed to upload attachment.' };
  }
}
