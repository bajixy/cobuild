-- CoBuild subcontractor opportunities
-- Run in Supabase SQL Editor after schema.sql and subcontractor_role_patch.sql.
-- Builders post specialist subcontracting work; subcontractor companies browse and contact directly.
-- No AI matching, no SMS dispatch.

create table if not exists public.subcontractor_opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  posted_by uuid not null references public.profiles(id) on delete cascade,
  trade text not null,
  specialist_field text not null,
  location text not null,
  stage text,
  scope_summary text not null,
  start_date date not null,
  duration_days integer not null default 1 check (duration_days > 0),
  budget_note text,
  builder_contact_name text not null,
  builder_contact_email text not null,
  builder_contact_phone text not null,
  status text not null default 'open' check (status in ('open', 'filled', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_subcontractor_opportunities_posted_by
  on public.subcontractor_opportunities(posted_by);

create index if not exists idx_subcontractor_opportunities_status
  on public.subcontractor_opportunities(status);

create index if not exists idx_subcontractor_opportunities_status_created
  on public.subcontractor_opportunities(status, created_at desc);

alter table public.subcontractor_opportunities enable row level security;

-- Builders create and manage their own opportunities.
create policy "builders manage own subcontractor opportunities"
  on public.subcontractor_opportunities
  for all
  using (auth.uid() = posted_by)
  with check (auth.uid() = posted_by);

-- Subcontractor companies can browse open opportunities.
create policy "subcontractors read open opportunities"
  on public.subcontractor_opportunities
  for select
  using (
    status = 'open'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'subcontractor'
    )
  );
