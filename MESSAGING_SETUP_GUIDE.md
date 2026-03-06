# React Native Messaging Screen - Setup Guide

## Overview

This guide describes the newly created messaging system for the Huzly mobile app. The system allows users to:
- View a list of contacts from the `clients` table
- Send and receive real-time messages
- Display chat history with proper formatting

## File Structure

```
apps/mobile/
├── app/
│   └── messaging/                    # New messaging routes
│       ├── _layout.tsx              # Stack layout for messaging screens
│       ├── index.tsx                # Messaging screen entry point
│       └── chat.tsx                 # Chat screen entry point
├── src/
│   ├── lib/
│   │   └── messages/
│   │       └── messages.service.ts  # Supabase queries & real-time logic
│   └── screens/
│       ├── MessagingScreen.tsx      # Contact list UI
│       └── ChatScreen.tsx           # One-on-one chat UI
└── app/
    └── (tabs)/
        └── _layout.tsx              # Updated with Messages tab
```

## Components Created

### 1. **messages.service.ts** (`/src/lib/messages/messages.service.ts`)

Service layer for all messaging operations.

**Functions:**

- `fetchContacts()` - Fetches all clients with their user information
  - Joins `clients` table with `users` table
  - Returns formatted Contact objects

- `fetchMessages(current_user_id, other_user_id)` - Fetch conversation history
  - Returns Message objects sorted by timestamp

- `sendMessage(payload)` - Insert a new message into the database
  - Provides error handling and validation

- `subscribeToMessages(current_user_id, other_user_id, callback)` - Real-time updates
  - Uses Supabase's real-time subscription
  - Triggers callback when new messages arrive

**Types:**

```typescript
interface Contact {
  client_id: string;
  user_id: string;
  name: string;
  company_name: string;
  profile_photo: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  sent_at: string;
  read: boolean;
}
```

### 2. **MessagingScreen.tsx** (`/src/screens/MessagingScreen.tsx`)

Contact list screen that displays all available clients for messaging.

**Features:**
- Fetches contacts on component mount
- Displays contacts in a scrollable FlatList
- Shows contact avatar (profile photo or placeholder)
- Shows contact name and company name
- Handles loading, error, and empty states
- Navigation to ChatScreen on contact press

**UI Elements:**
- Header with "Messages" title
- Contact cards with:
  - Avatar (50x50 circle)
  - Name (primary text)
  - Company name (secondary text)
  - Arrow indicator

**States:**
- Loading: Shows ActivityIndicator
- Error: Displays error message
- Empty: Shows "No Contacts Available" message
- Success: Displays contact list

### 3. **ChatScreen.tsx** (`/src/screens/ChatScreen.tsx`)

One-on-one messaging interface.

**Features:**
- Fetches conversation history
- Real-time message subscription
- Send new messages
- Display sent/received messages with different styling
- Loading state while fetching initial messages
- Error handling

**UI Elements:**
- Header with back button and contact name
- Message bubbles:
  - Sent messages: Light blue with right alignment
  - Received messages: Light gray with left alignment
  - Timestamps on each message
- Input area with:
  - Text input field
  - Send button (enabled when text is not empty)

**Real-time Updates:**
- Subscribes to new messages automatically
- Cleans up subscription on unmount

### 4. **Navigation Setup**

**New Routes:**
- `/messaging` - Contact list screen
- `/messaging/chat?receiver_id=<uuid>&receiver_name=<name>` - Chat screen

**Tab Integration:**
- Added "Messages" tab to the tab bar
- Uses message.fill icon from IconSymbol
- Integrated with existing Expo Router setup

## Database Schema Expectations

The system expects the following database structure:

```sql
-- Users table (existing)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  profile_photo TEXT,
  ...
);

-- Clients table (existing)
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  company_name TEXT,
  ...
);

-- Messages table (required)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert their own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
```

## Usage

### 1. Access the Messaging Screen

```tsx
// From any screen, navigate to messaging
router.push('/messaging');
```

### 2. Open a Chat

The MessagingScreen handles navigation automatically:

```tsx
// When user taps a contact, the navigation happens automatically
// params: receiver_id, receiver_name
router.push({
  pathname: '/messaging/chat',
  params: { receiver_id: contact.user_id, receiver_name: contact.name }
});
```

### 3. Send a Message

Messages are sent automatically when the user taps the send button:

```tsx
const { error } = await sendMessage({
  sender_id: currentUser.id,
  receiver_id: otherUserId,
  content: messageText
});
```

## Styling

Colors used:
- **Primary**: `#3B6FD8` (Blue)
- **BG**: `#FFFFFF` (White)
- **Text Primary**: `#1F2937` (Dark gray)
- **Text Secondary**: `#6B7280` (Medium gray)
- **Border**: `#E5E7EB` (Light gray)
- **Message BG**: `#E7F1FF` (Light blue for sent)
- **Received BG**: `#F3F4F6` (Light gray for received)

## Error Handling

All operations include error handling:

```tsx
const { data, error } = await fetchContacts();

if (error) {
  // Handle error
  setError(error);
  return;
}

// Use data
setContacts(data);
```

Errors are displayed to users in:
- Banner messages
- Error states on screens

## Performance Considerations

1. **Real-time Subscriptions**: Automatically cleaned up on unmount
2. **Message Loading**: Messages are loaded once and updated in real-time
3. **Contact List**: Uses FlatList for efficient rendering of large lists
4. **Avatar Caching**: React Native handles image caching automatically

## Future Enhancements

Potential improvements:
- [ ] Message read receipts
- [ ] Typing indicators
- [ ] Message search
- [ ] Pin/archive conversations
- [ ] Media message support
- [ ] Notification badges on tab
- [ ] Persistent scroll position
- [ ] Message reactions/emojis

## Troubleshooting

### No Contacts Appearing?

1. Check that `clients` table has records
2. Verify `users` table is properly linked
3. Check RLS policies on `clients` table

### Messages Not Loading?

1. Verify `messages` table exists
2. Check RLS policies allow user to read messages
3. Check sender_id and receiver_id are valid UUIDs

### Real-time Not Working?

1. Verify Supabase real-time is enabled in project settings
2. Check that messages table has replication enabled
3. Ensure user has INSERT permission for messages

## References

- [Supabase Docs](https://supabase.com/docs)
- [React Native Guide](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/routing/introduction/)
