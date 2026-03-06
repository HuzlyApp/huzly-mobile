/**
 * messages.service.ts
 *
 * All messaging operations for the Huzly app.
 * Handles fetching contacts and managing messages from Supabase.
 */

import { supabase } from '@/lib/config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Contact {
  client_id: string;
  user_id: string;
  name: string;
  company_name: string;
  profile_photo: string | null;
}

export interface Conversation {
  user_id: string;
  name: string;
  company_name: string;
  profile_photo: string | null;
  last_message: string;
  last_message_at: string;
  is_sender: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  sent_at: string;
  read: boolean;
}

export interface MessagePayload {
  sender_id: string;
  receiver_id: string;
  content: string;
}

export interface ServiceResult<T = void> {
  data: T | null;
  error: string | null;
}

// ─── Fetch Contacts ──────────────────────────────────────────────────────────

/**
 * Fetch all clients from the clients table for messaging.
 *
 * Returns list with id, user_id, and company_name.
 * The user_id is used as receiver_id for sending messages.
 */
export async function fetchContacts(): Promise<ServiceResult<Contact[]>> {
  try {
    console.log('=== fetchContacts START ===');
    
    const { data, error } = await supabase
      .from('clients')
      .select('id, user_id, company_name')
      .order('company_name', { ascending: true });

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Supabase error:', error);
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      console.log('No clients found - data is empty or null');
      return { data: [], error: null };
    }

    console.log('Raw data from Supabase:', JSON.stringify(data, null, 2));

    // Format the result to match Contact interface
    const formattedContacts: Contact[] = data.map((client: any) => ({
      client_id: client.id,
      user_id: client.user_id,
      name: client.company_name,
      company_name: client.company_name,
      profile_photo: null,
    }));

    console.log('Formatted contacts:', JSON.stringify(formattedContacts, null, 2));
    console.log('=== fetchContacts END ===');
    
    return { data: formattedContacts, error: null };
  } catch (err: any) {
    console.error('Exception in fetchContacts:', err);
    return { data: null, error: err.message || 'Failed to fetch contacts' };
  }
}

// ─── Fetch Conversations ─────────────────────────────────────────────────────

/**
 * Fetch all conversations for the current user with last message and company info.
 * Shows conversations where the user is either sender or receiver.
 * @param current_user_id - The ID of the current user
 */
export async function fetchConversations(
  current_user_id: string,
): Promise<ServiceResult<Conversation[]>> {
  try {
    // Fetch all messages involving the current user, ordered by most recent
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        sent_at,
        sender:users!messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo
        ),
        receiver:users!messages_receiver_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo
        )
      `)
      .or(
        `sender_id.eq.${current_user_id},receiver_id.eq.${current_user_id}`
      )
      .order('sent_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    if (!messages || messages.length === 0) {
      return { data: [], error: null };
    }

    // Group messages by conversation partner
    const conversationMap = new Map<string, any>();

    for (const msg of messages as any[]) {
      // Determine the other user in the conversation
      const otherUser = msg.sender_id === current_user_id ? msg.receiver : msg.sender;
      const otherUserId = msg.sender_id === current_user_id ? msg.receiver_id : msg.sender_id;

      // Skip if we already have this conversation (we want the most recent message)
      if (conversationMap.has(otherUserId)) continue;

      conversationMap.set(otherUserId, {
        user_id: otherUserId,
        name: `${otherUser.first_name} ${otherUser.last_name}`,
        profile_photo: otherUser.profile_photo,
        last_message: msg.content,
        last_message_at: msg.sent_at,
        is_sender: msg.sender_id === current_user_id,
      });
    }

    // Fetch client info to get company names
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('user_id, company_name');

    if (clientError) {
      console.warn('Failed to fetch client info:', clientError.message);
    }

    // Build a map of user_id to company_name
    const companyMap = new Map<string, string>();
    if (clients) {
      for (const client of clients) {
        companyMap.set(client.user_id, client.company_name || 'Unknown Company');
      }
    }

    // Format conversations with company names
    const conversations: Conversation[] = Array.from(conversationMap.values()).map(
      (conv: any) => ({
        ...conv,
        company_name: companyMap.get(conv.user_id) || 'Individual',
      })
    );

    return { data: conversations, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to fetch conversations' };
  }
}

// ─── Fetch Messages ──────────────────────────────────────────────────────────

/**
 * Fetch messages between two users.
 * @param current_user_id - The ID of the current user
 * @param other_user_id - The ID of the other user in the conversation
 */
export async function fetchMessages(
  current_user_id: string,
  other_user_id: string,
): Promise<ServiceResult<Message[]>> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${current_user_id},receiver_id.eq.${other_user_id}),` +
        `and(sender_id.eq.${other_user_id},receiver_id.eq.${current_user_id})`
      )
      .order('sent_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to fetch messages' };
  }
}

// ─── Send Message ────────────────────────────────────────────────────────────

/**
 * Send a message to another user.
 */
export async function sendMessage(payload: MessagePayload): Promise<ServiceResult<Message>> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: payload.sender_id,
        receiver_id: payload.receiver_id,
        content: payload.content,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to send message' };
  }
}

// ─── Real-time Subscription ──────────────────────────────────────────────────

/**
 * Subscribe to messages in real-time.
 * @param callback - Function to call when new messages arrive
 */
export function subscribeToMessages(
  current_user_id: string,
  other_user_id: string,
  callback: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${current_user_id}:${other_user_id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload: any) => {
        const message = payload.new as Message;
        // Only trigger callback if message is part of this conversation
        if (
          (message.sender_id === current_user_id && message.receiver_id === other_user_id) ||
          (message.sender_id === other_user_id && message.receiver_id === current_user_id)
        ) {
          callback(message);
        }
      }
    )
    .subscribe();

  return channel;
}
