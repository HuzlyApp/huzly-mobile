import { supabase } from '@/lib/config/supabase';
import { ALLOWED_MIME_TYPES, type FileLike, validateAttachment } from '@/lib/messages/attachments.service';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string | null;
  category: string | null;
  description: string | null;
  status: 'Open' | 'In Progress' | 'Resolved';
  created_at: string;
}

export interface SupportTicketResult<T> {
  data: T | null;
  error: string | null;
}

interface CreateTicketInput {
  userId: string;
  subject: string;
  category?: string;
  description: string;
}

export interface WorkerTicketCategory {
  category: string;
}

export interface SupportTicketAttachment {
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
}

export async function createSupportTicket(
  input: CreateTicketInput
): Promise<SupportTicketResult<SupportTicket>> {
  try {
    const insertPayload = {
      user_id: input.userId,
      subject: input.subject,
      ...(input.category ? { category: input.category } : {}),
      description: input.description,
      status: 'Open',
    };

    let { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert(insertPayload)
      .select('*')
      .single();

    // Backward-compatible fallback in case support_tickets.category doesn't exist yet.
    if (ticketError && input.category) {
      const message = ticketError.message?.toLowerCase?.() ?? '';
      if (message.includes('column') && message.includes('category')) {
        const fallbackInsert = await supabase
          .from('support_tickets')
          .insert({
            user_id: input.userId,
            subject: input.subject,
            description: `[Category: ${input.category}] ${input.description}`,
            status: 'Open',
          })
          .select('*')
          .single();
        ticket = fallbackInsert.data;
        ticketError = fallbackInsert.error;
      }
    }

    if (ticketError || !ticket) {
      return { data: null, error: ticketError?.message ?? 'Failed to create ticket.' };
    }

    const { error: activityError } = await supabase.from('activity_logs').insert({
      user_id: input.userId,
      action: 'CREATE_TICKET',
      entity_type: 'support_ticket',
      entity_id: ticket.id,
      details: { subject: input.subject, category: input.category ?? null },
    });

    if (activityError) {
      return { data: null, error: activityError.message };
    }

    return { data: ticket as SupportTicket, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message ?? 'Failed to create ticket.' };
  }
}

export async function fetchWorkerTicketCategories(): Promise<SupportTicketResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('worker_ticket_category')
      .select('category')
      .order('category', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const values = (data ?? [])
      .map((row: WorkerTicketCategory) => row.category?.trim())
      .filter((value): value is string => !!value);

    return { data: Array.from(new Set(values)), error: null };
  } catch (error: any) {
    return { data: null, error: error?.message ?? 'Failed to load ticket categories.' };
  }
}

export async function uploadSupportTicketAttachment(
  file: FileLike,
  userId: string,
): Promise<SupportTicketResult<SupportTicketAttachment>> {
  try {
    const validationError = validateAttachment(file);
    if (validationError) {
      return { data: null, error: validationError };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      return { data: null, error: 'Unsupported file type.' };
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    // One folder per user so Storage RLS can match: ticket_attachments/<uid>/...
    const path = `ticket_attachments/${userId}/${timestamp}_${safeName}`;

    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('ticket-files')
      .upload(path, blob, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return { data: null, error: uploadError.message };
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from('ticket-files')
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signedError || !signed?.signedUrl) {
      return { data: null, error: signedError?.message ?? 'Failed to generate file URL.' };
    }

    return {
      data: {
        fileName: file.name,
        fileType: file.mimeType,
        fileUrl: signed.signedUrl,
        fileSize: file.size,
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error?.message ?? 'Failed to upload ticket attachment.' };
  }
}

export async function fetchSupportTicketById(
  ticketId: string,
  userId: string
): Promise<SupportTicketResult<SupportTicket>> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as SupportTicket, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message ?? 'Failed to load ticket.' };
  }
}

export async function fetchSupportTicketsByUser(
  userId: string
): Promise<SupportTicketResult<SupportTicket[]>> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data ?? []) as SupportTicket[], error: null };
  } catch (error: any) {
    return { data: null, error: error?.message ?? 'Failed to load tickets.' };
  }
}

export function ticketIsOpen(t: SupportTicket): boolean {
  return t.status === 'Open' || t.status === 'In Progress';
}

/** Appends a worker reply to `description` (no separate replies table). */
export async function appendSupportTicketReply(
  ticketId: string,
  userId: string,
  reply: string,
): Promise<SupportTicketResult<SupportTicket>> {
  const trimmed = reply.trim();
  if (!trimmed) {
    return { data: null, error: 'Reply is empty.' };
  }

  const existing = await fetchSupportTicketById(ticketId, userId);
  if (existing.error || !existing.data) {
    return { data: null, error: existing.error ?? 'Ticket not found.' };
  }

  const stamp = new Date().toLocaleString();
  const block = `\n\n--- ${stamp} (you) ---\n${trimmed}`;
  const nextDesc = `${existing.data.description ?? ''}${block}`;

  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .update({ description: nextDesc })
      .eq('id', ticketId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Could not save reply.' };
    }

    return { data: data as SupportTicket, error: null };
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e.message : 'Could not save reply.' };
  }
}

export async function deleteSupportTicket(
  ticketId: string,
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('support_tickets').delete().eq('id', ticketId).eq('user_id', userId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to delete ticket.' };
  }
}
