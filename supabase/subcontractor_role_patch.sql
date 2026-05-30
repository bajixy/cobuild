-- CoBuild 3-role database patch
-- Run this in Supabase SQL Editor after the original schema.sql.

-- 1) Add subcontractor as a first-class user role.
alter type user_role add value if not exists 'subcontractor';

-- 2) Make sure profiles can store email and phone from email/password signup.
alter table profiles add column if not exists email text;
alter table profiles add column if not exists phone text;

-- 3) Add useful indexes for auth/profile lookups and dashboard loading.
create unique index if not exists idx_profiles_email_unique on profiles(email) where email is not null;
create unique index if not exists idx_profiles_phone_unique on profiles(phone) where phone is not null;
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_labour_requests_posted_by on labour_requests(posted_by);
create index if not exists idx_labour_requests_status on labour_requests(status);
create index if not exists idx_workers_crew_leader_status on workers(crew_leader_id, status);
create index if not exists idx_matches_crew_status on matches(crew_leader_id, status);
create index if not exists idx_assignments_crew_status on assignments(crew_leader_id, status);

-- 4) Replace signup trigger so builder, subcontractor, and crew_leader all work.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone, full_name, role, email)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email, new.phone, 'New user'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'builder'),
    new.email
  )
  on conflict (id) do update set
    phone = excluded.phone,
    full_name = excluded.full_name,
    role = excluded.role,
    email = excluded.email;

  return new;
end;
$$ language plpgsql security definer;
