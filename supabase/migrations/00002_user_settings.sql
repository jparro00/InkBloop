-- User settings table for encrypted API keys
create table user_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  anthropic_key   text,
  has_api_key     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table user_settings enable row level security;

-- Users can read their own settings (has_api_key flag visible, encrypted key is opaque ciphertext)
create policy "Users can view own settings"
  on user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings"
  on user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings"
  on user_settings for update using (auth.uid() = user_id);
