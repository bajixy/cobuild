-- CoBuild project workforce model patch
-- Run this in Supabase SQL Editor after schema.sql and subcontractor_role_patch.sql.

-- Organisations can represent either a builder company or subcontractor business.
alter table organisations add column if not exists organisation_kind text;

update organisations o
set organisation_kind = p.role::text
from profiles p
where p.id = o.owner_id
  and o.organisation_kind is null
  and p.role::text in ('builder', 'subcontractor');

-- Labour requests can be created by builders or subcontractors.
-- Builders can request crews directly. Subcontractors can also request crews for accepted jobs.
alter table labour_requests add column if not exists requesting_org_id uuid references organisations(id);
alter table labour_requests add column if not exists site_address text;
alter table labour_requests add column if not exists site_city text;
alter table labour_requests add column if not exists title text;

update labour_requests lr
set requesting_org_id = o.id
from organisations o
where o.owner_id = lr.posted_by
  and lr.requesting_org_id is null;

-- Assignments need a confirmed headcount even before exact worker IDs are selected.
alter table assignments add column if not exists agreed_headcount integer;

update assignments a
set agreed_headcount = greatest(cardinality(a.worker_ids), 1)
where a.agreed_headcount is null;

-- Useful production indexes for dashboards and project workforce summaries.
create index if not exists idx_projects_org_status on projects(organisation_id, status);
create index if not exists idx_labour_requests_project_status on labour_requests(project_id, status);
create index if not exists idx_labour_requests_requesting_org on labour_requests(requesting_org_id);
create index if not exists idx_assignments_request_status on assignments(labour_request_id, status);
create index if not exists idx_assignments_crew_status on assignments(crew_leader_id, status);

-- Summary view: one row per project showing labour demand and active supply.
create or replace view project_workforce_summary as
select
  p.id as project_id,
  p.organisation_id,
  p.name as project_name,
  p.address,
  p.city,
  p.stage,
  p.status as project_status,
  count(distinct lr.id) filter (where lr.status in ('open', 'matching')) as open_request_count,
  coalesce(sum(lr.headcount) filter (where lr.status in ('open', 'matching')), 0) as open_worker_demand,
  count(distinct a.id) filter (where a.status in ('confirmed', 'in_progress')) as active_assignment_count,
  coalesce(
    sum(coalesce(a.agreed_headcount, nullif(cardinality(a.worker_ids), 0), lr.headcount))
      filter (where a.status in ('confirmed', 'in_progress')),
    0
  ) as active_worker_count,
  count(distinct a.crew_leader_id) filter (where a.status in ('confirmed', 'in_progress')) as active_crew_leader_count
from projects p
left join labour_requests lr on lr.project_id = p.id
left join assignments a on a.labour_request_id = lr.id
group by p.id;

-- Detail view: actual named workers currently assigned to a project.
-- This only shows workers once worker_ids are attached to assignments.
create or replace view project_active_workers as
select
  p.id as project_id,
  p.name as project_name,
  lr.id as labour_request_id,
  a.id as assignment_id,
  a.status as assignment_status,
  cl.id as crew_leader_id,
  cl.full_name as crew_leader_name,
  w.id as worker_id,
  w.full_name as worker_name,
  w.phone as worker_phone,
  w.trade_specialty,
  a.agreed_start,
  a.agreed_end
from projects p
join labour_requests lr on lr.project_id = p.id
join assignments a on a.labour_request_id = lr.id
join profiles cl on cl.id = a.crew_leader_id
join lateral unnest(a.worker_ids) assigned_worker_id on true
join workers w on w.id = assigned_worker_id
where a.status in ('confirmed', 'in_progress');
