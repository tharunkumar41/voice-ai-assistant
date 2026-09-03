-- Voice AI Personal Assistant - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Businesses
create table if not exists public.businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  industry text not null,
  phone text,
  language_pref text default 'en' check (language_pref in ('en', 'hi')),
  timezone text default 'Asia/Kolkata',
  created_at timestamptz default now()
);

-- Workflows
create table if not exists public.workflows (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null,
  trigger_type text default 'missed_call',
  greeting text not null,
  closing_message text not null,
  language text default 'en' check (language in ('en', 'hi')),
  questions jsonb default '[]'::jsonb,
  conditions jsonb default '[]'::jsonb,
  actions jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversations
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  workflow_id uuid references public.workflows(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade not null,
  caller_name text,
  caller_phone text,
  status text default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),
  intent text,
  urgency boolean default false,
  collected_data jsonb default '{}'::jsonb,
  summary text,
  transcript jsonb default '[]'::jsonb,
  action_taken text,
  follow_up_status text default 'pending' check (follow_up_status in ('pending', 'contacted', 'completed', 'closed')),
  calendar_event_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_businesses_owner on public.businesses(owner_id);
create index if not exists idx_workflows_business on public.workflows(business_id);
create index if not exists idx_conversations_business on public.conversations(business_id);
create index if not exists idx_conversations_status on public.conversations(follow_up_status);

-- RLS
alter table public.businesses enable row level security;
alter table public.workflows enable row level security;
alter table public.conversations enable row level security;

-- Policies: owner can do everything on their own data
create policy "Users can manage their businesses"
  on public.businesses for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can manage workflows of their businesses"
  on public.workflows for all
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  )
  with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

create policy "Users can manage conversations of their businesses"
  on public.conversations for all
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  )
  with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- Seed helper function (optional)
-- You can insert sample workflows after creating a business.
