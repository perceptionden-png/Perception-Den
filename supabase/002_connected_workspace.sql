begin;
alter table public.profiles add column username text not null default '';
alter table public.profiles add column details jsonb not null default '{}' check (jsonb_typeof(details)='object');
alter table public.projects add column details jsonb not null default '{}' check (jsonb_typeof(details)='object' and octet_length(details::text) < 2000000);
alter table public.collaboration_requests add column role text not null default '' check (length(role)<=100);
grant update(details) on public.profiles to authenticated;
grant insert(id,details), update(details) on public.projects to authenticated;
grant insert(role) on public.collaboration_requests to authenticated;
create table public.saved_projects (
 user_id uuid references public.profiles(id) on delete cascade not null,
 project_id uuid references public.projects(id) on delete cascade not null,
 primary key(user_id,project_id)
);
alter table public.saved_projects enable row level security;
revoke all on public.saved_projects from public,anon,authenticated;
grant select,insert,delete on public.saved_projects to authenticated;
create policy saved_own on public.saved_projects for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create or replace function public.pd_create_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name,username,role,skills) values(new.id,
 left(coalesce(new.raw_user_meta_data->>'full_name',''),160),
 left(coalesce(new.raw_user_meta_data->>'username',''),24),
 left(coalesce(new.raw_user_meta_data->>'role',''),100),
 case when jsonb_typeof(new.raw_user_meta_data->'skills')='array' then array(select jsonb_array_elements_text(new.raw_user_meta_data->'skills')) else '{}'::text[] end);
 return new;
end; $$;
commit;
