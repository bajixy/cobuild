-- Run in Supabase SQL Editor.
create table if not exists public.subcontractor_opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  posted_by uuid not null references auth.users(id) on delete cascade,
  trade text not null,
  specialist_field text not null,
  location text not null,
  stage text,
  scope_summary text not null,
 