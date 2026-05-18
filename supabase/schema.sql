-- ============================================================
-- CoBuild MVP — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('builder', 'crew_leader', 'admin');
create type trade_type as enum (
  'formwork', 'carpentry', 'concrete', 'plumbing',
  'electrical', 'tiling', 'painting', 'roofing',
  'plastering', 'general_labour', 'other'
);
create type request_status as enum ('open', 'matching', 'filled', 'cancelled', 'expired');
create type match_status as enum ('suggested', 'sent', 'accepted', 'declined', 'expired');
create type assignment_status as enum ('confirmed', 'in_progress', 'completed', 'cancelled');

-- ============================================================
-- USERS & ORGANISATIONS
-- ============================================================

-- profiles extends Supabase auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  full_name text not null,
  role user_role not null default 'builder',
  email text,
  created_at timestamptz default now()
);

-- builders/companies
create table organisations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) not null,
  name text not null,
  abn text,
  city text,
  state text default 'QLD',
  created_at timestamptz default now()
);

-- crew leader's worker network
create table workers (
  id uuid primary key default gen_random_uuid(),
  crew_leader_id uuid references profiles(id) not null,
  full_name text not null,
  phone text not null,
  trade_specialty trade_type[],
  experience_years integer default 0,
  typical_rate numeric(10,2),
  status text default 'active', -- active | inactive | bench
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- PROJECTS
-- ============================================================

create table projects (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade not null,
  name text not null,
  address text,
  city text,
  stage text, -- setup, slab, frame, lockup, fit-out, handover
  start_date date,
  target_completion date,
  status text default 'active',
  created_at timestamptz default now()
);

-- ============================================================
-- LABOUR REQUESTS (the core of Workflow A)
-- ============================================================

create table labour_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  posted_by uuid references profiles(id) not null,

  -- raw input
  voice_url text,
  raw_input text,

  -- structured by AI
  trade trade_type not null,
  headcount integer not null default 1,
  start_date date not null,
  end_date date not null,
  hourly_rate numeric(10,2),
  scope_summary text,
  access_notes text,
  site_contact text,

  -- state
  status request_status default 'open',
  urgency text default 'normal', -- normal | urgent | tomorrow
  created_at timestamptz default now()
);

-- ============================================================
-- MATCHING & ASSIGNMENTS
-- ============================================================

create table matches (
  id uuid primary key default gen_random_uuid(),
  labour_request_id uuid references labour_requests(id) on delete cascade not null,
  crew_leader_id uuid references profiles(id) not null,

  score numeric(3,2),  -- 0.00 to 1.00
  rank integer,         -- 1, 2, 3
  ai_reasoning text,

  status match_status default 'suggested',
  magic_token text unique default encode(gen_random_bytes(8), 'hex'),

  sent_at timestamptz,
  opened_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz default now()
);

create index idx_matches_request on matches(labour_request_id);
create index idx_matches_token on matches(magic_token);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  labour_request_id uuid references labour_requests(id) not null,
  match_id uuid references matches(id) not null,
  crew_leader_id uuid references profiles(id) not null,

  worker_ids uuid[] default '{}', -- workers placed on this job
  agreed_rate numeric(10,2),
  agreed_start date,
  agreed_end date,

  status assignment_status default 'confirmed',
  created_at timestamptz default now()
);

-- ============================================================
-- RATINGS (for the workforce graph moat)
-- ============================================================

create table ratings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) not null,
  rater_id uuid references profiles(id) not null,
  rated_user_id uuid references profiles(id),
  rated_worker_id uuid references workers(id),

  reliability integer check (reliability between 1 and 5),
  quality integer check (quality between 1 and 5),
  communication integer check (communication between 1 and 5),
  comment text,

  created_at timestamptz default now()
);

-- ============================================================
-- MESSAGES (for SMS tracking)
-- ============================================================

create table messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null, -- sms | push | in_app
  to_phone text,
  to_user_id uuid references profiles(id),
  related_match_id uuid references matches(id),
  body text not null,

  twilio_sid text,
  delivered_at timestamptz,
  status text default 'queued', -- queued | sent | delivered | failed

  created_at timestamptz default now()
);

-- ============================================================
-- AI RUNS (every Claude call logged for cost tracking + debugging)
-- ============================================================

create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null, -- 'scope_synthesizer' | 'crew_matcher'
  input jsonb,
  output jsonb,
  model text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,6),
  latency_ms integer,
  related_request_id uuid references labour_requests(id),
  created_at timestamptz default now()
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table organisations enable row level security;
alter table workers enable row level security;
alter table projects enable row level security;
alter table labour_requests enable row level security;
alter table matches enable row level security;
alter table assignments enable row level security;
alter table ratings enable row level security;
alter table messages enable row level security;

-- Profiles: users see only their own profile
create policy "users see own profile" on profiles
  for all using (auth.uid() = id);

-- Organisations: owners only
create policy "owners see their org" on organisations
  for all using (auth.uid() = owner_id);

-- Workers: crew leaders only see their own network
create policy "crew leaders manage their workers" on workers
  for all using (auth.uid() = crew_leader_id);

-- Projects: org owners only
create policy "org owners see their projects" on projects
  for all using (
    exists (
      select 1 from organisations
      where organisations.id = projects.organisation_id
      and organisations.owner_id = auth.uid()
    )
  );

-- Labour requests: posted-by user OR crew leader who's been matched
create policy "users see requests they posted" on labour_requests
  for all using (auth.uid() = posted_by);

create policy "matched crew leaders see requests" on labour_requests
  for select using (
    exists (
      select 1 from matches
      where matches.labour_request_id = labour_requests.id
      and matches.crew_leader_id = auth.uid()
    )
  );

-- Matches: the matched crew leader OR the request owner
create policy "users see relevant matches" on matches
  for all using (
    auth.uid() = crew_leader_id
    or auth.uid() in (
      select posted_by from labour_requests where id = matches.labour_request_id
    )
  );

-- Assignments: both parties see them
create policy "parties see their assignments" on assignments
  for all using (
    auth.uid() = crew_leader_id
    or auth.uid() in (
      select posted_by from labour_requests where id = assignments.labour_request_id
    )
  );

-- ============================================================
-- HELPER: auto-create profile when user signs up
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone, full_name, role)
  values (
    new.id,
    new.phone,
    coalesce(new.raw_user_meta_data->>'full_name', new.phone),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'builder')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
