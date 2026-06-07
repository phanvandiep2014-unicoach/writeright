-- ══════════════════════════════════════════════
-- LuyenViet Database Schema
-- Run this in Supabase SQL Editor (one time)
-- ══════════════════════════════════════════════

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  tier text default 'free' check (tier in ('free', 'standard', 'premium')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Evaluations table
create table public.evaluations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  task_type smallint default 2 check (task_type in (1, 2)),
  task_prompt text not null,
  essay_text text,
  overall_band numeric(2,1),
  ta_band numeric(2,1),
  lr_band numeric(2,1),
  gra_band numeric(2,1),
  cc_band numeric(2,1),
  feedback jsonb,
  model_intro text,
  word_count integer,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.evaluations enable row level security;
create policy "Users can view own evaluations" on public.evaluations for select using (auth.uid() = user_id);
create policy "Users can insert own evaluations" on public.evaluations for insert with check (auth.uid() = user_id);

-- Index for fast queries
create index idx_evaluations_user_id on public.evaluations(user_id);
create index idx_evaluations_created_at on public.evaluations(created_at desc);

-- Daily usage tracking view
create or replace view public.daily_usage as
select
  user_id,
  date_trunc('day', created_at) as day,
  count(*) as eval_count
from public.evaluations
group by user_id, date_trunc('day', created_at);
