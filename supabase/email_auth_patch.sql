-- CoBuild email/password auth patch
-- Run this in Supabase SQL Editor after the original schema.sql.

-- Make sure profiles can store email + phone from auth metadata.
alter table profiles add column if not exists email text;
alter table profiles add column if not exists phone text;

-- Replace the auth trigger so email/password signups also create useful profiles.
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

-- Optional helper index for looking users up by phone later.
create unique index if not exists idx_profiles_phone_unique on profiles(phone) where phone is not null;
create unique index if not exists idx_profiles_email_unique on profiles(email) where email is not null;
