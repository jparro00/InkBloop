-- Simulator state tables: stores the "Meta side" of the simulation.
-- Separate from the app's `messages` / `participant_profiles` tables,
-- which represent Ink Bloop's own data populated via webhooks.

-- Simulator client profiles (the "Meta users")
create table sim_profiles (
  psid         text primary key,
  first_name   text not null,
  last_name    text not null default '',
  name         text not null,
  platform     text not null check (platform in ('instagram', 'messenger')),
  profile_pic  text,
  instagram    text,
  created_at   timestamptz not null default now()
);

-- Simulator conversations
create table sim_conversations (
  id                text primary key,
  platform          text not null check (platform in ('instagram', 'messenger')),
  participant_psid  text not null references sim_profiles(psid),
  updated_time      bigint not null,
  read_watermark    bigint
);

create index idx_sim_conv_participant on sim_conversations(participant_psid);

-- Simulator messages (full history, no 20-msg cap)
create table sim_messages (
  mid           text primary key,
  conversation_id text not null references sim_conversations(id),
  sender_id     text not null,
  recipient_id  text not null,
  text          text,
  attachments   jsonb,
  timestamp     bigint not null,
  is_echo       boolean not null default false
);

create index idx_sim_messages_conv on sim_messages(conversation_id, timestamp);

-- Simulator config (single-row)
create table sim_config (
  id              int primary key default 1 check (id = 1),
  page_id         text not null default '111222333444555',
  ig_user_id      text not null default '999888777666555',
  webhook_url     text not null default 'https://jpjvexfldouobiiczhax.supabase.co/functions/v1/webhook',
  verify_token    text not null default 'inkbloop-dev-token',
  app_secret      text not null default 'inkbloop-dev-secret',
  access_token    text not null default 'SIM_ACCESS_TOKEN_DEV'
);

-- Insert default config row
insert into sim_config (id) values (1);

-- No RLS on sim tables — access controlled at Edge Function level.
-- The simulator is a dev/test tool; if multi-user access is needed later, add RLS.

-- Enable Realtime so the simulator UI can subscribe for live updates
alter publication supabase_realtime add table sim_messages;
alter publication supabase_realtime add table sim_conversations;
alter publication supabase_realtime add table sim_profiles;
