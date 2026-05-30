-- CoBuild RLS recursion fix
-- Run this in Supabase SQL Editor if you see:
-- "infinite recursion detected in policy for relation labour_requests"

-- The recursion comes from labour_requests policy reading matches,
-- while matches policy reads labour_requests. These SECURITY DEFINER
-- helpers let policies check ownership/matching without recursively
-- applying the same RLS policies.

create or replace function public.is_labour_request_owner(request_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.labour_requests lr
    where lr.id = request_id
      and lr.posted_by = auth.uid()
  );
$$;

create or replace function public.is_matched_crew_leader(request_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.labour_request_id = request_id
      and m.crew_leader_id = auth.uid()
  );
$$;

-- Drop old recursive policies.
drop policy if exists "users see requests they posted" on public.labour_requests;
drop policy if exists "matched crew leaders see requests" on public.labour_requests;
drop policy if exists "users see relevant matches" on public.matches;
drop policy if exists "parties see their assignments" on public.assignments;

-- Labour requests: owners can manage their own requests.
create policy "owners manage labour requests" on public.labour_requests
  for all
  using (auth.uid() = posted_by)
  with check (auth.uid() = posted_by);

-- Labour requests: matched crew leaders can read the request only.
create policy "matched crew leaders read labour requests" on public.labour_requests
  for select
  using (public.is_matched_crew_leader(id));

-- Matches: crew leader can see their own match; request owner can see matches for their request.
create policy "users see relevant matches" on public.matches
  for select
  using (
    auth.uid() = crew_leader_id
    or public.is_labour_request_owner(labour_request_id)
  );

-- Matches: request owner can create/update/delete matches for their own request.
-- Service role bypasses RLS, so API matching still works even if this is not used.
create policy "request owners manage matches" on public.matches
  for all
  using (public.is_labour_request_owner(labour_request_id))
  with check (public.is_labour_request_owner(labour_request_id));

-- Assignments: crew leader can see their assignment; request owner can see/manage it.
create policy "parties see assignments" on public.assignments
  for select
  using (
    auth.uid() = crew_leader_id
    or public.is_labour_request_owner(labour_request_id)
  );

create policy "request owners manage assignments" on public.assignments
  for all
  using (public.is_labour_request_owner(labour_request_id))
  with check (public.is_labour_request_owner(labour_request_id));

notify pgrst, 'reload schema';
