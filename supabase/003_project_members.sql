begin;
create table public.project_members (
 project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default '',
 primary key(project_id,user_id)
);
alter table public.project_members enable row level security;
revoke all on public.project_members from public,anon,authenticated;
grant select,delete on public.project_members to authenticated;
create policy members_read on public.project_members for select to authenticated using(true);
create policy members_remove_owner on public.project_members for delete to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.creator_id=(select auth.uid())));
create function public.pd_accept_collaboration() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if new.status='accepted' and old.status='pending' then
  select creator_id into owner_id from public.projects where id=new.project_id;
  insert into public.project_members(project_id,user_id,role)
  values(new.project_id,case when new.sender_id=owner_id then new.receiver_id else new.sender_id end,new.role)
  on conflict do nothing;
 end if;
 return new;
end; $$;
revoke all on function public.pd_accept_collaboration() from public,anon,authenticated;
create trigger pd_collaboration_accepted after update of status on public.collaboration_requests for each row execute function public.pd_accept_collaboration();
insert into public.project_members(project_id,user_id,role)
select r.project_id,case when r.sender_id=p.creator_id then r.receiver_id else r.sender_id end,r.role from public.collaboration_requests r join public.projects p on p.id=r.project_id where r.status='accepted' on conflict do nothing;
commit;
