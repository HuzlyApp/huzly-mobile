# React Native Messaging System - Quick Start

## 📦 What Was Built

A complete messaging system with:
- **Contact List** - Browse clients from your database
- **Chat Screen** - Send and receive messages in real-time
- **Real-time Updates** - Messages appear instantly
- **Clean UI** - Messenger-style interface

---

## 🏗️ Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│               HUZLY MOBILE APP                          │
└─────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────────────────────────┐
        │   App Tabs (Bottom Navigation)    │
        │  Home | Explore | Messages ◄──────┤─ NEW
        └───────────────────────────────────┘
                        ↓
           ┌────────────────────────────┐
           │   MessagingScreen          │
           │  (Contact List)            │
           │  ┌──────────────────────┐  │
           │  │ [Avatar] John Doe    │  │
           │  │         Solar Corp   │  │
           │  └──────────────────────┘  │
           └────────────────┬─────────────┘
                            │ (tap contact)
                            ↓
           ┌────────────────────────────┐
           │   ChatScreen               │
           │  (1-on-1 Messaging)        │
           │  ┌──────────────────────┐  │
           │  │ You: Hi there!       │  │
           │  │ They: Hey! How are..│  │
           │  │ [Type message...]    │  │
           │  └──────────────────────┘  │
           └────────────────────────────┘
                        ↓
           ┌────────────────────────────┐
           │   Supabase Backend         │
           │  ┌──────────────────────┐  │
           │  │ messages table       │  │  ◄─ MUST CREATE
           │  │ clients table (exist)│  │
           │  │ users table (exist)  │  │
           │  └──────────────────────┘  │
           └────────────────────────────┘
```

---

## 📂 File Structure

```
apps/mobile/
│
├── app/
│   ├── (tabs)/
│   │   └── _layout.tsx                  ✏️ UPDATED (added Messages tab)
│   │
│   └── messaging/                       📁 NEW
│       ├── _layout.tsx                  Router Stack layout
│       ├── index.tsx                    Messaging screen route
│       └── chat.tsx                     Chat screen route
│
└── src/
    ├── lib/
    │   └── messages/
    │       └── messages.service.ts      📁 NEW (Supabase queries)
    │
    └── screens/
        ├── MessagingScreen.tsx          📁 NEW (Contact list)
        └── ChatScreen.tsx               📁 NEW (Chat interface)
```

---

## 🔧 Implementation Steps

### Step 1: Create Messages Table (REQUIRED)

In Supabase SQL Editor, run:

```sql
-- Create the messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for fast queries
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_messages_sent_at ON public.messages(sent_at DESC);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages
CREATE POLICY "Users can view their messages"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can only send their own messages
CREATE POLICY "Users can send messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
```

### Step 2: Enable Real-time

In Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Enable replication for **messages** table
3. Check: **insert**, **update** events

### Step 3: Verify Existing Tables

Make sure your database has:

**users table:**
```
id (UUID, primary key)
first_name (text)
last_name (text)
profile_photo (text)
```

**clients table:**
```
id (UUID, primary key)
user_id (UUID, foreign key → users.id)
company_name (text)
```

### Step 4: Test in Your App

```bash
# In apps/mobile folder
npm run dev
```

Then:
1. Login to the app
2. Tap the **Messages** tab (new!)
3. See your contacts list
4. Tap a contact to chat
5. Send a test message

---

## 🎯 Key Features

### MessagingScreen
- ✅ Auto-fetches all contacts from `clients` table
- ✅ Shows avatar, name, company
- ✅ Navigates to chat on tap
- ✅ Handles loading/error states
- ✅ Displays empty state if no contacts

### ChatScreen
- ✅ Loads message history
- ✅ Real-time message updates
- ✅ Send messages with Send button
- ✅ Timestamps on each message
- ✅ Different bubble colors for sent/received
- ✅ Keyboard auto-handling

---

## 🚢 Data Flow Example

**User Flow:**
```
1. App loads → User logged in
2. User taps "Messages" tab
3. MessagingScreen fetches contacts from Supabase
   Query: clients JOIN users
4. Shows list of contacts to message
5. User taps "John Doe" (a client)
6. ChatScreen loads:
   - Fetches old messages
   - Subscribes to real-time updates
7. User types message and taps Send
8. Message inserted into Supabase
9. Real-time subscription triggers
10. Message appears immediately
11. If other user is online, they see it
```

---

## 💡 Supabase Query Examples

### Fetch Contacts
```typescript
const { data } = await supabase
  .from('clients')
  .select(`
    id,
    user_id,
    company_name,
    users (first_name, last_name, profile_photo)
  `);
```

### Fetch Messages
```typescript
const { data } = await supabase
  .from('messages')
  .select('*')
  .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),
       and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
  .order('sent_at', { ascending: true });
```

### Send Message
```typescript
await supabase
  .from('messages')
  .insert({
    sender_id: currentUserId,
    receiver_id: otherUserId,
    content: messageText
  });
```

### Real-time Subscription
```typescript
supabase
  .channel('messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      // New message arrived!
      console.log('New message:', payload.new);
    })
  .subscribe();
```

---

## 🎨 Styling Reference

**Colors:**
- Primary Blue: `#3B6FD8`
- White: `#FFFFFF`
- Dark Text: `#1F2937`
- Gray Text: `#6B7280`
- Light Border: `#E5E7EB`

**Components:**
- Contact cards with avatar circles
- Message bubbles (blue for sent, gray for received)
- Touch-friendly buttons and inputs

---

## 📱 UI Preview

### MessagingScreen
```
┌─────────────────────────┐
│ Messages                │
├─────────────────────────┤
│ [A] Alice Smith         │
│     Acme Corp           │
├─────────────────────────┤
│ [B] Bob Johnson         │
│     TechStartup LLC     │
├─────────────────────────┤
│ [C] Carol Davis         │
│     Green Energy Inc    │
└─────────────────────────┘
```

### ChatScreen
```
┌─────────────────────────┐
│ ‹ Back    John Doe      │
├─────────────────────────┤
│                         │
│         You: Hi! ► 2:30 │
│                         │
│ ◄ 2:31 Hey, how are you│
│                         │
├─────────────────────────┤
│ [Type a message...] ►   │
└─────────────────────────┘
```

---

## ✅ Quick Checklist

- [ ] Created `messages` table in Supabase
- [ ] Enabled real-time replication on `messages`
- [ ] Verified `users` table has required fields
- [ ] Verified `clients` table has user_id foreign key
- [ ] Ran `npm run dev` to start the app
- [ ] Logged in and can see Messages tab
- [ ] Contacts appear in the list
- [ ] Can tap a contact and open chat
- [ ] Can send a message
- [ ] Message appears in real-time

---

## 🆘 Troubleshooting

**No contacts showing?**
- Check `clients` table has data
- Verify `user_id` foreign key is set
- Check RLS policies on `clients` table

**Can't send messages?**
- Verify `messages` table was created
- Check RLS policy allows INSERT
- Verify user is authenticated

**Real-time not working?**
- Check real-time is enabled in Supabase project
- Check `messages` table replication is ON
- Verify INSERT event is enabled

**Avatar not showing?**
- Check `profile_photo` column has URL values
- Fallback avatar shows initials automatically

---

## 📚 Next Steps

1. **Customize styling** - Change colors in the screen files
2. **Add features** - Read receipts, typing indicators
3. **Handle media** - Image/file messages
4. **Add notifications** - Badge on tab, push notifications
5. **Search messages** - Find old conversations

---

## 🔗 Resources

- [Complete Setup Guide](./MESSAGING_SETUP_GUIDE.md)
- [Implementation Checklist](./MESSAGING_IMPLEMENTATION_CHECKLIST.md)
- [Supabase Docs](https://supabase.com/docs/guides/realtime)
- [Expo Router Docs](https://docs.expo.dev/routing/introduction/)

---

**Ready to message! 🎉**
