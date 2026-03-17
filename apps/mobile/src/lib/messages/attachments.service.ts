import { supabase } from '@/lib/config/supabase';

export type MessageAttachment = {
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
};

// Shape used inside the app when picking a file
export type FileLike = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

const BUCKET = 'message-files';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'image/jpeg',
  'image/png',
] as const;

export function validateAttachment(file: FileLike): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Unsupported file type. Allowed: PDF, DOCX, XLSX, JPG, PNG.';
  }

  if (file.size > MAX_SIZE_BYTES) {
    return 'File is too large. Maximum size is 10MB.';
  }

  return null;
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
    // Store files inside a folder named message_attachments in the bucket
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

    const { data: signed, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

    if (signedError || !signed?.signedUrl) {
      return { attachment: null, error: signedError?.message ?? 'Failed to generate file URL.' };
    }

    const attachment: MessageAttachment = {
      fileName: file.name,
      fileType: file.mimeType,
      fileUrl: signed.signedUrl,
      fileSize: file.size,
    };

    return { attachment, error: null };
  } catch (error: any) {
    return { attachment: null, error: error?.message ?? 'Failed to upload attachment.' };
  }
}

