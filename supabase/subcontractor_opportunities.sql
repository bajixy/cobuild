-- CoBuild subcontractor opportunities
-- Run this in Supabase SQL Editor after the base schema.

create table if not exists public.subcontractor_opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  posted_by uuid not null references auth.users(id) on delete cascade,
  trade text not null,
  specialist_field text not null,
  location text not null,
  stage text,
  scope_summary text not null,
  start_date date,
  duration_days integer default 1,
  budget_note text,
  builder_contact_name text,
  builder_contact_email text,
  builder_contact_phone text,
  status text not null default 'open',
  created_at timestamptz default now()
);

alter table public.subcontractor_opportunities enable row level security;

create index if not exists idx_subcontractor_opportunities_status on public.subcontractor_opportunities(status);
create index if not exists idx_subcontractor_opportunities_trade on public.subcontractor_opportunities(trade);
create index if not exists idx_subcontractor_opportunities_posted_by on public.subcontractor_opportunities(posted_by);
create index if not exists idx_subcontractor_opportunities_project