-- Resolve privileges from current Auth data so old JWTs cannot retain revoked access.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from auth.users where id = auth.uid()
    and raw_app_meta_data ->> 'role' in ('super_admin','admin','content_manager','page_manager','support_manager')
    and coalesce(raw_app_meta_data ->> 'admin_active', 'true') = 'true');
$$;
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from auth.users where id = auth.uid()
    and raw_app_meta_data ->> 'role' = 'super_admin'
    and coalesce(raw_app_meta_data ->> 'admin_active', 'true') = 'true');
$$;

-- Keep the display profile synchronized atomically with Auth role changes.
create or replace function public.sync_admin_profile()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if new.raw_app_meta_data ->> 'role' in ('super_admin','admin','content_manager','page_manager','support_manager') then
    insert into public.admin_profiles(user_id, role, is_active)
    values(new.id, new.raw_app_meta_data ->> 'role', coalesce(new.raw_app_meta_data ->> 'admin_active', 'true') = 'true')
    on conflict(user_id) do update set role = excluded.role, is_active = excluded.is_active, updated_at = now();
  else
    delete from public.admin_profiles where user_id = new.id;
  end if;
  return new;
end; $$;
drop trigger if exists sync_auth_admin_profile on auth.users;
create trigger sync_auth_admin_profile after insert or update of raw_app_meta_data on auth.users
for each row execute function public.sync_admin_profile();

create or replace function public.set_admin_active(target_user_id uuid, active boolean)
returns void language plpgsql security definer set search_path = public
as $$ begin
  if not public.is_super_admin() then raise exception 'Only super administrators can change administrator access'; end if;
  if target_user_id = auth.uid() then raise exception 'You cannot change your own access'; end if;
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('admin_active', active)
  where id = target_user_id;
end; $$;
-- Profiles are display-only; access changes go through privileged Auth APIs.
drop policy if exists admin_all on public.admin_profiles;
drop policy if exists admin_profiles_super_read on public.admin_profiles;
create policy admin_profiles_super_read on public.admin_profiles for select to authenticated using(public.is_super_admin());

insert into public.admin_profiles(user_id, role, is_active)
select id, raw_app_meta_data ->> 'role', coalesce(raw_app_meta_data ->> 'admin_active', 'true') = 'true'
from auth.users where raw_app_meta_data ->> 'role' in ('super_admin','admin','content_manager','page_manager','support_manager')
on conflict(user_id) do update set role = excluded.role, is_active = excluded.is_active, updated_at = now();

create or replace function public.assign_admin_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public
as $$ begin
  if not public.is_super_admin() then raise exception 'Only a super administrator can assign administrator roles'; end if;
  if target_user_id = auth.uid() then raise exception 'You cannot change your own access'; end if;
  if new_role not in ('super_admin','admin','content_manager','page_manager','support_manager') then raise exception 'Invalid administrator role'; end if;
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role, 'admin_active', true)
  where id = target_user_id;
  if not found then raise exception 'User not found'; end if;
end; $$;
