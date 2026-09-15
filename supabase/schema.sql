-- Run once in a NEW Supabase schema. This does not replace existing tables.
-- If the earlier users/projects schema was already installed, migrate it first.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 160),
  role text not null default '' check (char_length(role) <= 100),
  skills text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  message text not null default '' check (char_length(message) <= 5000),
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

create index projects_creator_idx on public.projects (creator_id);
create index requests_project_idx on public.collaboration_requests (project_id);
create index requests_inbox_idx
  on public.collaboration_requests (receiver_id, created_at desc);
create index requests_sender_idx on public.collaboration_requests (sender_id);

-- Prevent simultaneous invitation/application duplicates between the same pair.
-- A new request is permitted after the earlier one is resolved.
create unique index requests_pending_pair_unique
  on public.collaboration_requests (
    project_id, least(sender_id, receiver_id), greatest(sender_id, receiver_id)
  ) where status = 'pending';

-- Create the profile in the signup transaction, including when email
-- verification is enabled and the new user has no browser session yet.
create function public.pd_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role, skills)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 160),
    left(coalesce(new.raw_user_meta_data ->> 'role', ''), 100),
    case when jsonb_typeof(new.raw_user_meta_data -> 'skills') = 'array'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'skills'))
      else '{}'::text[] end
  );
  return new;
end;
$$;
revoke all on function public.pd_create_profile() from public, anon, authenticated;
create trigger pd_profile_after_signup
  after insert on auth.users for each row execute function public.pd_create_profile();

-- Profiles for any accounts that predate this script.
insert into public.profiles (id, full_name)
select id, left(coalesce(raw_user_meta_data ->> 'full_name', ''), 160)
from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.collaboration_requests enable row level security;

-- Explicit privileges prevent changing a request's parties or project owner.
revoke all on public.profiles, public.projects, public.collaboration_requests
  from public, anon, authenticated;
grant select on public.profiles, public.projects, public.collaboration_requests
  to authenticated;
grant update (full_name, role, skills) on public.profiles to authenticated;
grant insert (title, description, creator_id) on public.projects to authenticated;
grant update (title, description) on public.projects to authenticated;
grant delete on public.projects to authenticated;
grant insert (project_id, sender_id, receiver_id, message)
  on public.collaboration_requests to authenticated;
grant update (status) on public.collaboration_requests to authenticated;

-- Profiles and project listings are visible to signed-in members.
create policy profiles_read on public.profiles
  for select to authenticated using (true);
create policy profiles_edit_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy projects_read on public.projects
  for select to authenticated using (true);
create policy projects_create_own on public.projects
  for insert to authenticated with check (creator_id = (select auth.uid()));
create policy projects_edit_own on public.projects
  for update to authenticated
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));
create policy projects_delete_own on public.projects
  for delete to authenticated using (creator_id = (select auth.uid()));

create policy requests_read_participants on public.collaboration_requests
  for select to authenticated
  using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));

-- Application: receiver is the project creator.
-- Invitation: sender is the project creator.
create policy requests_send on public.collaboration_requests
  for insert to authenticated with check (
    sender_id = (select auth.uid()) and status = 'pending'
    and sender_id <> receiver_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.creator_id = sender_id or p.creator_id = receiver_id)
    )
  );

-- Only the recipient can resolve a pending request. Column grants above
-- prevent rewriting sender_id, receiver_id, project_id, or message.
create policy requests_respond on public.collaboration_requests
  for update to authenticated
  using (receiver_id = (select auth.uid()) and status = 'pending')
  with check (
    receiver_id = (select auth.uid()) and status in ('accepted', 'rejected')
  );

commit;
