-- Message storage for webhook-received messages
-- Keeps last 20 per conversation, older messages fetched on demand from Graph API
create table messages (
  mid              text primary key,
  conversation_id  text not null,
  sender_id        text not null,
  sender_name      text,
  recipient_id     text not null,
  platform         text not null check (platform in ('instagram', 'messenger')),
  text             text,
  attachments      jsonb,
  created_at       timestamptz not null,
  is_echo          boolean not null default false,
  user_id          uuid not null references auth.users(id) on delete cascade
);

create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_messages_user on messages(user_id);

alter table messages enable row level security;

create policy "Users can view own messages"
  on messages for select using (auth.uid() = user_id);
create policy "Users can insert own messages"
  on messages for insert with check (auth.uid() = user_id);
create policy "Users can delete own messages"
  on messages for delete using (auth.uid() = user_id);
