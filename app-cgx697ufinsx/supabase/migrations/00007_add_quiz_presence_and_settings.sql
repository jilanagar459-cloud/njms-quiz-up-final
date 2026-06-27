
-- Global app settings table (key-value store)
create table public.app_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Anyone can read settings, only admins can write
create policy "Public read settings" on public.app_settings
  for select using (true);

create policy "Admin write settings" on public.app_settings
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Seed default settings
insert into public.app_settings (key, value) values
  ('top_winners_count', '5')
on conflict (key) do nothing;

-- Quiz presence table: tracks who is currently on the quiz page
create table public.quiz_presence (
  id              uuid primary key default gen_random_uuid(),
  quiz_session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  unique (quiz_session_id, user_id)
);

alter table public.quiz_presence enable row level security;

-- Users can upsert their own presence
create policy "User manage own presence" on public.quiz_presence
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins can read all presence
create policy "Admin read presence" on public.quiz_presence
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Expose presence with profile details as a view for admins
create view public.quiz_presence_details as
  select
    qp.quiz_session_id,
    qp.user_id,
    qp.joined_at,
    qp.last_seen_at,
    p.name,
    p.surname,
    p.tehsil,
    p.phone
  from public.quiz_presence qp
  join public.profiles p on p.id = qp.user_id;

-- Allow realtime on quiz_presence
alter publication supabase_realtime add table public.quiz_presence;
