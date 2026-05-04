
create table public.bot_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  api_url text not null default '',
  username text not null default '',
  password text not null default '',
  bankroll numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bot_settings enable row level security;

create policy "own settings select" on public.bot_settings for select using (auth.uid() = user_id);
create policy "own settings insert" on public.bot_settings for insert with check (auth.uid() = user_id);
create policy "own settings update" on public.bot_settings for update using (auth.uid() = user_id);
create policy "own settings delete" on public.bot_settings for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger bot_settings_updated_at before update on public.bot_settings
for each row execute function public.set_updated_at();
