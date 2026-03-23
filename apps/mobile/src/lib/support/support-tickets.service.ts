import { supabase } from '@/lib/config/supabase';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string | null;
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
  description: string;
}

export async function createSupportTicket(
  input: CreateTicketInput
): Promise<SupportTicketResult<SupportTicket>> {
  try {
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: input.userId,
        subject: input.subject,
        description: input.description,
        status: 'Open',
      })
      .select('*')
      .single();

    if (ticketError || !ticket) {
      return { data: null, error: ticketError?.message ?? 'Failed to create ticket.' };
    }

    const { error: activityError } = await supabase.from('activity_logs').insert({
      user_id: input.userId,
      action: 'CREATE_TICKET',
      entity_type: 'support_ticket',
      entity_id: ticket.id,
      details: { subject: input.subject },
    });

    if (activityError) {
      return { data: null, error: activityError.message };
    }

    return { data: ticket as SupportTicket, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message ?? 'Failed to create ticket.' };
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
