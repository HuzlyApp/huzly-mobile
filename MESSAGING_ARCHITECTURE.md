# Messaging System Architecture Diagram

## Complete System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    HUZLY MOBILE APPLICATION                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tab Navigation (Expo Router)                                   │
│  ┌─────────────┬──────────────┬─────────────────────────────┐   │
│  │    Home     │   Explore    │   Messages ◄── NEW TAB      │   │
│  └──────┬──────┴──────┬───────┴────────────┬────────────────┘   │
│         │             │                    │                    │
│         ↓             ↓                    ↓                    │
│    [Home Screen]  [Explore]         [Messaging Stack]         │
│                                       │                        │
│                                  ┌────┴─────┐                 │
│                                  ↓          ↓                 │
│                         [Contact List]  [Chat Screen]         │
│                                                                │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                         REACT COMPONENTS                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MessagingScreen (src/screens/MessagingScreen.tsx)             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Fetch contacts on mount                                  │ │
│  │ • Display FlatList of contacts                            │ │
│  │ • Handle loading/error/empty states                       │ │
│  │ • Navigate to ChatScreen on contact tap                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓ (uses)                              │
│  messages.service.ts → fetchContacts()                          │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  ChatScreen (src/screens/ChatScreen.tsx)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Fetch message history                                    │ │
│  │ • Subscribe to real-time updates                          │ │
│  │ • Render message bubbles                                  │ │
│  │ • Handle message input & send                             │ │
│  │ • Format timestamps                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓ (uses)                              │
│  messages.service.ts → fetchMessages()                          │
│  messages.service.ts → subscribeToMessages()                    │
│  messages.service.ts → sendMessage()                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                    MESSAGING SERVICE LAYER                       │
│              (src/lib/messages/messages.service.ts)             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Functions:                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ fetchContacts()                                          │  │
│  │ → SELECT from clients table                             │  │
│  │ → JOIN with users table                                 │  │
│  │ → Return formatted Contact[]                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ fetchMessages(user_id, other_user_id)                   │  │
│  │ → SELECT from messages table                            │  │
│  │ → WHERE (sender_id = user1 AND receiver_id = user2)    │  │
│  │      OR (sender_id = user2 AND receiver_id = user1)    │  │
│  │ → ORDER BY sent_at DESC                                 │  │
│  │ → Return Message[]                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ sendMessage(payload)                                     │  │
│  │ → INSERT into messages table                            │  │
│  │ → sender_id, receiver_id, content                       │  │
│  │ → Return Message                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ subscribeToMessages(user_id, other_user_id, callback)   │  │
│  │ → Connect WebSocket to Supabase Real-time              │  │
│  │ → Listen for INSERT events on messages table            │  │
│  │ → Call callback on new message                          │  │
│  │ → Return channel (for cleanup)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Database Tables:                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ users                                                    │  │
│  │ ├─ id (UUID, PRIMARY KEY)                               │  │
│  │ ├─ first_name (TEXT)                                    │  │
│  │ ├─ last_name (TEXT)                                     │  │
│  │ └─ profile_photo (TEXT, nullable)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ clients                                                  │  │
│  │ ├─ id (UUID, PRIMARY KEY)                               │  │
│  │ ├─ user_id (UUID, FK → users.id)                        │  │
│  │ └─ company_name (TEXT)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ messages ◄── NEW TABLE (MUST CREATE)                    │  │
│  │ ├─ id (UUID, PRIMARY KEY)                               │  │
│  │ ├─ sender_id (UUID, FK → auth.users.id)                │  │
│  │ ├─ receiver_id (UUID, FK → auth.users.id)              │  │
│  │ ├─ content (TEXT, NOT NULL)                             │  │
│  │ ├─ read (BOOLEAN, default false)                        │  │
│  │ ├─ sent_at (TIMESTAMP, default now)                     │  │
│  │ └─ created_at (TIMESTAMP, default now)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Indexes:                                                        │
│  ├─ idx_messages_sender_id                                     │
│  ├─ idx_messages_receiver_id                                   │
│  └─ idx_messages_sent_at                                       │
│                                                                  │
│  RLS Policies (Row Level Security):                             │
│  ├─ SELECT: Users can view THEIR messages only                │
│  ├─ INSERT: Users can insert THEIR messages only              │
│  └─ UPDATE: Not allowed (immutable messages)                   │
│                                                                  │
│  Real-time:                                                      │
│  └─ Replication enabled for INSERT, UPDATE events              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Contact List Flow
```
User Opens App
    ↓
Tap "Messages" Tab
    ↓
MessagingScreen Component Mounts
    ↓
useEffect Hook Triggered
    ↓
Call fetchContacts()
    ↓
Supabase Query:
SELECT 
  clients.id,
  clients.user_id,
  clients.company_name,
  users.first_name,
  users.last_name,
  users.profile_photo
FROM clients
  LEFT JOIN users ON clients.user_id = users.id
    ↓
Format Result
    ↓
setContacts(formattedData)
    ↓
FlatList Re-renders with Contact Cards
    ↓
Each Card Shows:
├─ Avatar (profile_photo or initials)
├─ Name (first_name + last_name)
├─ Company (company_name)
└─ Arrow Indicator
```

### Chat Message Flow
```
User Taps Contact
    ↓
Navigation with Params:
├─ receiver_id = contact.user_id
└─ receiver_name = contact.name
    ↓
ChatScreen Component Mounts
    ↓
useEffect Hook Triggered (1)
    ↓
Call fetchMessages(currentUser.id, receiverId)
    ↓
Supabase Query - Get History:
SELECT * FROM messages
  WHERE (sender_id = user1 AND receiver_id = user2)
     OR (sender_id = user2 AND receiver_id = user1)
  ORDER BY sent_at ASC
    ↓
setMessages(messageHistory)
    ↓
FlatList Re-renders with Message Bubbles
    ↓
(SAME useEffect) Subscribe to Real-time
    ↓
Supabase Real-time Channel:
SUBSCRIBE ON messages
  WHERE (sender_id = user1 AND receiver_id = user2)
     OR (sender_id = user2 AND receiver_id = user1)
    ↓
When New Message Arrives:
Callback triggers → setMessages(prev => [...prev, newMessage])
    ↓
Chat updates instantly
    ↓
Cleanup: unsubscribe() on unmount
```

### Send Message Flow
```
User Types Message
    ↓
messageText State Updates
    ↓
Send Button Enabled
    ↓
User Presses Send Button
    ↓
handleSendMessage() Function
    ↓
Clear Input (setMessageText(''))
    ↓
Call sendMessage({
  sender_id: currentUser.id,
  receiver_id: otherUser.id,
  content: messageText
})
    ↓
Supabase INSERT:
INSERT INTO messages (sender_id, receiver_id, content)
  VALUES (sender_id, receiver_id, content)
    ↓
If Error:
├─ Restore message text
├─ Show error banner
└─ setSending(false)
    ↓
If Success:
├─ Message inserted in DB
├─ Row stored with sent_at = NOW()
├─ Real-time event triggers (INSERT)
├─ subscribeToMessages callback fires
├─ setMessages adds new message to state
├─ FlatList re-renders
└─ User sees their message immediately
```

## Component Communication

```
App Structure:
┌─────────────────────────────┐
│   (tabs) Tab Layout         │
│  └─ home/explore/messaging  │
└────────────┬────────────────┘
             │
             ↓
    ┌────────────────────┐
    │ Messaging Stack    │
    ├────────────────────┤
    │ MessagingScreen    │ ← Contact List
    │ ChatScreen         │ ← Chat Interface
    │ _layout.tsx        │ ← Router Setup
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ Service Layer      │
    ├────────────────────┤
    │ messages.service   │
    │ ├─ fetchContacts   │
    │ ├─ fetchMessages   │
    │ ├─ sendMessage     │
    │ └─ subscribe       │
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ Supabase Queries   │
    └────────────────────┘

```

## State Management Flow

```
MessagingScreen State:
┌─────────────────────────────────┐
│ const [contacts, setContacts]   │
│ const [loading, setLoading]     │
│ const [error, setError]         │
└────────────┬────────────────────┘
             │ (on mount)
             ↓
        fetchContacts()
             │
        Updates state
             │
             ↓
      Component re-renders

ChatScreen State:
┌─────────────────────────────────┐
│ const [messages, setMessages]   │
│ const [loading, setLoading]     │
│ const [sending, setSending]     │
│ const [messageText, setText]    │
│ const [error, setError]         │
└────────────┬────────────────────┘
             │ (on mount)
             ↓
    fetchMessages() + subscribe()
             │
        Updates state
             │
             ↓
      Component re-renders
             ↓
        (user types)
        setState(text)
             ↓
      Input component re-renders
             ↓
        (user sends)
        sendMessage()
             │
        Real-time triggers
             │
        setMessages(newMsg)
             ↓
    FlatList re-renders
```

## File Dependencies

```
app/(tabs)/_layout.tsx
  └─ imports: messaging tab
    └─ app/messaging/_layout.tsx
      ├─ app/messaging/index.tsx
      │ └─ src/screens/MessagingScreen.tsx
      │   └─ src/lib/messages/messages.service.ts
      │
      └─ app/messaging/chat.tsx
        └─ src/screens/ChatScreen.tsx
          └─ src/lib/messages/messages.service.ts

src/screens/MessagingScreen.tsx
  imports:
  ├─ expo-router (useRouter)
  ├─ react-native (UI components)
  └─ src/lib/messages/messages.service.ts (fetchContacts)

src/screens/ChatScreen.tsx
  imports:
  ├─ expo-router (useRouter, useLocalSearchParams)
  ├─ react-native (UI components)
  ├─ src/lib/messages/messages.service.ts (fetchMessages, sendMessage, subscribe)
  └─ src/hooks/use-auth-session.ts (useAuthSession)

src/lib/messages/messages.service.ts
  imports:
  └─ src/lib/config/supabase.ts (supabase client)
```

---

This architecture ensures:

✅ **Clean Separation** - Service layer isolates Supabase logic
✅ **Reusability** - Service functions can be used anywhere
✅ **Testability** - Easy to test components and services separately
✅ **Scalability** - Can add more features without major refactoring
✅ **Performance** - Real-time updates efficient, proper cleanup
✅ **Security** - RLS policies protect data at database level
