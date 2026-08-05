-- ============================================================
-- Brooklyn Business School — Lead Monitoring Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop table if exists (for fresh setup)
drop table if exists leads;

-- Create leads table
create table leads (
  id              uuid primary key default uuid_generate_v4(),
  group_name      text not null default 'Unknown Group',
  post_url        text,
  post_content    text not null,
  summary         text,
  is_lead         boolean not null default false,
  confidence_score numeric(4, 3) default 0,
  sender          text,
  created_at      timestamptz not null default now()
);

-- Enable Row Level Security
alter table leads enable row level security;

-- Policy: allow anonymous read (for dashboard)
create policy "Allow anon read"
  on leads for select
  using (true);

-- Policy: allow service role to insert
create policy "Allow service insert"
  on leads for insert
  with check (true);

-- Enable Realtime for leads table
alter publication supabase_realtime add table leads;

-- Index for faster queries
create index idx_leads_created_at on leads (created_at desc);
create index idx_leads_is_lead on leads (is_lead);

-- ============================================================
-- Sample test data (optional, remove in production)
-- ============================================================
insert into leads (group_name, post_url, post_content, summary, is_lead, confidence_score, sender)
values
  (
    'مجموعة المحترفين المصريين',
    'https://facebook.com/groups/example/posts/1',
    'حد يرشحلي مكان اخد فيه MBA قوي في القاهرة بسرعة؟',
    'Student inquiring about MBA programs in Cairo',
    true,
    0.95,
    'test@example.com'
  ),
  (
    'Business Cairo Network',
    'https://facebook.com/groups/example/posts/2',
    'عايز اكمل تعليمي وآخد درجة الماجستير في إدارة الأعمال',
    'Prospective student interested in MBA/Master''s degree',
    true,
    0.88,
    'test2@example.com'
  ),
  (
    'Egyptian MBA Community',
    'https://facebook.com/groups/example/posts/3',
    'شكرا على حفلة النجاح كانت تجربة رائعة',
    'General social post, not a lead',
    false,
    0.05,
    'test3@example.com'
  );
