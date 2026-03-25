import { supabase } from '@/lib/config/supabase';

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
