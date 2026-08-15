-- ============================================================
-- Brooklyn Business School — Multi-Tenant Lead Monitoring Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Cleanup existing objects for a clean migration run
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop table if exists leads cascade;
drop table if exists monitors cascade;
drop table if exists profiles cascade;

-- 1. Profiles Table (User settings & plan)
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null,
  telegram_chat_id    text,
  plan                text not null default 'free', -- 'free' | 'pro'
  created_at          timestamptz not null default now()
);

-- 2. Monitors Table (User target monitoring groups & custom keywords)
create table public.monitors (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.profiles(id) on delete cascade not null,
  group_url           text,
  group_name          text not null,
  niche_description   text,
  keywords            text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

-- 3. Leads Table (Detected leads scoped to user and monitor)
create table public.leads (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.profiles(id) on delete cascade not null,
  monitor_id          uuid references public.monitors(id) on delete set null,
  group_name          text not null default 'Unknown Group',
  post_url            text,
  post_content        text not null,
  summary             text,
  is_lead             boolean not null default false,
  confidence_score    numeric(4, 3) default 0,
  sender              text,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS) Configuration
-- ============================================================

alter table public.profiles enable row level security;
alter table public.monitors enable row level security;
alter table public.leads enable row level security;

-- Profiles Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Monitors Policies
create policy "Users can view own monitors"
  on public.monitors for select
  using (auth.uid() = user_id);

create policy "Users can insert own monitors"
  on public.monitors for insert
  with check (auth.uid() = user_id);

create policy "Users can update own monitors"
  on public.monitors for update
  using (auth.uid() = user_id);

create policy "Users can delete own monitors"
  on public.monitors for delete
  using (auth.uid() = user_id);

-- Leads Policies
create policy "Users can view own leads"
  on public.leads for select
  using (auth.uid() = user_id);

create policy "Service role or owner can insert leads"
  on public.leads for insert
  with check (true);

-- ============================================================
-- Triggers for Auth Integration
-- ============================================================

-- Function to handle new auth user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, plan)
  values (new.id, new.email, 'free');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automate profile creation
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Realtime & Publications Configuration
-- ============================================================

-- Ensure supabase_realtime publication exists and includes our tables
drop publication if exists supabase_realtime;
create publication supabase_realtime for table public.leads, public.monitors;

-- ============================================================
-- Performance Indexes
-- ============================================================
create index idx_monitors_user_id on public.monitors (user_id);
create index idx_leads_user_id on public.leads (user_id);
create index idx_leads_monitor_id on public.leads (monitor_id);
create index idx_leads_created_at on public.leads (created_at desc);
create index idx_leads_is_lead on public.leads (is_lead);
