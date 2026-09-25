-- SJ Law Academy: Supabase schema
-- Run this entire file in the Supabase SQL Editor for project vfqjobdslrlljxsclcrd.
-- Includes shared-content migration 202609250001; safe for new and existing databases.
-- It is idempotent: existing tables and records are not dropped or overwritten.
--
-- Administrator access is granted by setting auth.users.app_metadata.role to one of:
-- super_admin, admin, content_manager, page_manager, support_manager.
-- Do not place roles in user_metadata: students can edit that value themselves.

begin;

create extension if not exists "pgcrypto";

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
    in ('super_admin', 'admin', 'content_manager', 'page_manager', 'support_manager');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin';
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;

-- Every student who signs up in the user website receives a matching profile.
create or replace function public.handle_new_student()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.student_profiles (id, full_name, email, phone, university, academic_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''), new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'university',
    coalesce(new.raw_user_meta_data ->> 'academicLevel', '100L')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  university text,
  academic_level text,
  subscription_status text not null default 'trial' check (subscription_status in ('active','expired','trial','none')),
  is_active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Mirrors the privileged Auth role with information the admin dashboard can safely
-- display. Auth app_metadata remains the source used by RLS and Edge Functions.
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','admin','content_manager','page_manager','support_manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.academic_levels (
  id uuid primary key default gen_random_uuid(),
  level smallint not null unique check (level between 100 and 500 and level % 100 = 0),
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  duration_months integer not null default 6 check (duration_months > 0),
  objectives text[] not null default '{}',
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  academic_level_id uuid references public.academic_levels(id) on delete set null,
  title text not null,
  code text,
  instructor text not null default '',
  description text not null default '',
  academic_level text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  thumbnail_url text,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  content text,
  -- YouTube video URL, direct video URL, or media:<storage path> for uploads.
  video_url text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Upgrade existing lesson tables too: CREATE TABLE IF NOT EXISTS does not add
-- missing columns. Existing video links are preserved.
alter table public.lessons add column if not exists video_url text;
comment on column public.lessons.video_url is
  'Optional tutorial video: YouTube watch/share/shorts/live/embed URL, direct MP4/WebM URL, or media:<storage path>. Set lesson status to published to show it on the student website.';

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  description text not null default '',
  storage_path text not null unique,
  mime_type text,
  file_size bigint check (file_size >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.case_law (
  id uuid primary key default gen_random_uuid(),
  case_name text not null,
  citation text not null default '',
  court text not null default '',
  year integer check (year between 1000 and 3000),
  area_of_law text not null default '',
  summary text not null default '',
  legal_principles text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  question_type text not null check (question_type in ('mcq','essay','problem')),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer jsonb,
  explanation text,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  marks integer not null default 1 check (marks > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  academic_level text,
  duration_minutes integer check (duration_minutes > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mock_exam_questions (
  exam_id uuid references public.mock_exams(id) on delete cascade,
  question_id uuid references public.questions(id) on delete restrict,
  sort_order integer not null default 0,
  primary key (exam_id, question_id)
);

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  selected_option integer,
  is_correct boolean,
  submitted_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.student_lesson_progress (
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz,
  bookmarked boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, lesson_id)
);

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content jsonb not null default '{}'::jsonb,
  meta_description text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  last_edited_by uuid references auth.users(id) on delete set null,
  last_edited_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  academic_level_id uuid references public.academic_levels(id) on delete set null,
  plan text not null,
  status text not null check (status in ('active','expired','trial','cancelled')),
  starts_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.student_profiles(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  reference text not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'NGN',
  plan text,
  status text not null check (status in ('success','failed','pending','refunded')),
  paid_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  target text not null default 'All Students',
  status text not null default 'draft' check (status in ('draft','scheduled','sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_notifications (
  notification_id uuid references public.notifications(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  read_at timestamptz,
  delivered_at timestamptz,
  primary key (notification_id, user_id)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.student_profiles(id) on delete set null,
  subject text not null,
  message text,
  category text not null default 'General',
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Internal key-value records used by the existing admin dashboard for
-- collections that do not yet have dedicated relational editors (for example,
-- legacy audit-log and admin-users views). The Edge Function uses the service
-- role to access this table; it is never exposed to browser clients.
create table if not exists public.kv_store_f63d7d22 (
  key text primary key,
  value jsonb not null
);

-- These functions are deliberately callable only by an existing Super Admin.
-- They update app_metadata server-side, so a browser can never grant itself access.
create or replace function public.assign_admin_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a super administrator can assign administrator roles';
  end if;
  if new_role not in ('super_admin','admin','content_manager','page_manager','support_manager') then
    raise exception 'Invalid administrator role';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  where id = target_user_id;
  if not found then raise exception 'User not found'; end if;

  insert into public.admin_profiles (user_id, role, is_active)
  values (target_user_id, new_role, true)
  on conflict (user_id) do update set role = excluded.role, is_active = true, updated_at = timezone('utc', now());
end;
$$;

create or replace function public.set_admin_active(target_user_id uuid, active boolean)
returns void language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a super administrator can change administrator access';
  end if;
  update public.admin_profiles set is_active = active, updated_at = timezone('utc', now()) where user_id = target_user_id;
  if not found then raise exception 'Administrator profile not found'; end if;
  update auth.users
  set raw_app_meta_data = case when active then raw_app_meta_data else coalesce(raw_app_meta_data, '{}'::jsonb) - 'role' end
  where id = target_user_id;
end;
$$;

-- Bootstrap is limited to a completely empty admin_profiles table. Run it once
-- from the Supabase SQL Editor after creating the Auth user. It cannot be used
-- to add a second super admin; use assign_admin_role from an authenticated
-- super-admin session, or grant_super_admin_by_email in the SQL Editor.
create or replace function public.bootstrap_first_super_admin(target_email text)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare first_admin uuid;
begin
  if exists (select 1 from public.admin_profiles) then
    raise exception 'A first administrator already exists; use assign_admin_role instead';
  end if;
  select id into first_admin from auth.users where lower(email) = lower(target_email);
  if first_admin is null then
    raise exception 'User % not found. Create it in Authentication > Users first.', target_email;
  end if;
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'super_admin') where id = first_admin;
  insert into public.admin_profiles (user_id, role, is_active)
  values (first_admin, 'super_admin', true);
end;
$$;

-- SQL Editor only: promote an existing Auth account by email. SECURITY INVOKER
-- requires the caller's own database privileges; browser roles cannot execute it.
-- This does not create an Auth account or change its password.
create or replace function public.grant_super_admin_by_email(target_email text)
returns void language plpgsql security invoker set search_path = public, auth
as $$
declare target_id uuid;
begin
  if target_email is null or btrim(target_email) = '' then
    raise exception 'An existing Auth user email is required';
  end if;

  select id into target_id from auth.users
  where lower(email) = lower(btrim(target_email));
  if target_id is null then
    raise exception 'User % not found. Create it in Authentication > Users first.', target_email;
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'super_admin')
  where id = target_id;

  insert into public.admin_profiles (user_id, role, is_active)
  values (target_id, 'super_admin', true)
  on conflict (user_id) do update
  set role = excluded.role, is_active = true, updated_at = timezone('utc', now());
end;
$$;

revoke all on function public.grant_super_admin_by_email(text) from public, anon, authenticated, service_role;
revoke all on function public.assign_admin_role(uuid, text) from public;
revoke all on function public.set_admin_active(uuid, boolean) from public;
revoke all on function public.bootstrap_first_super_admin(text) from public;
grant execute on function public.assign_admin_role(uuid, text) to authenticated;
grant execute on function public.set_admin_active(uuid, boolean) to authenticated;

create index if not exists courses_status_idx on public.courses(status);
create index if not exists lessons_course_idx on public.lessons(course_id, sort_order);
create index if not exists questions_course_idx on public.questions(course_id, status);
create index if not exists practice_attempts_student_idx on public.practice_attempts(student_id, submitted_at desc);
create index if not exists payments_student_idx on public.payments(student_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets(status, updated_at desc);
create index if not exists audit_log_created_idx on public.admin_audit_log(created_at desc);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_student();

-- Keep all standard records timestamped consistently.
do $$ declare tbl text; begin
  foreach tbl in array array['student_profiles','admin_profiles','academic_levels','courses','lessons','resources','case_law','questions','mock_exams','site_pages','subscriptions','payments','notifications','support_tickets'] loop
    execute format('drop trigger if exists set_%1$s_updated_at on public.%1$s', tbl);
    execute format('create trigger set_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', tbl);
  end loop;
end $$;

-- Lock tables down by default. Admins receive full CMS access; students only see
-- public content and their own account/notification rows.
do $$ declare tbl text; begin
  foreach tbl in array array['student_profiles','admin_profiles','academic_levels','courses','lessons','resources','case_law','questions','mock_exams','mock_exam_questions','practice_attempts','student_lesson_progress','site_pages','subscriptions','payments','notifications','user_notifications','support_tickets','admin_audit_log','kv_store_f63d7d22'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists admin_all on public.%I', tbl);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', tbl);
  end loop;
end $$;

drop policy if exists "student_profile_self" on public.student_profiles;
drop policy if exists "student_profile_update_self" on public.student_profiles;
drop policy if exists "published_courses_read" on public.courses;
drop policy if exists "published_academic_levels_read" on public.academic_levels;
drop policy if exists "published_lessons_read" on public.lessons;
drop policy if exists "published_case_law_read" on public.case_law;
drop policy if exists "published_pages_read" on public.site_pages;
drop policy if exists "own_notifications_read" on public.user_notifications;
drop policy if exists "own_subscription_read" on public.subscriptions;
drop policy if exists "own_payments_read" on public.payments;
drop policy if exists "student_ticket_create" on public.support_tickets;
drop policy if exists "student_ticket_read" on public.support_tickets;
drop policy if exists "published_questions_read" on public.questions;
drop policy if exists "published_resources_read" on public.resources;
drop policy if exists "sent_notifications_read" on public.notifications;
drop policy if exists "own_notifications_insert" on public.user_notifications;
drop policy if exists "own_notifications_update" on public.user_notifications;
drop policy if exists "own_practice_attempts_insert" on public.practice_attempts;
drop policy if exists "own_practice_attempts_read" on public.practice_attempts;
drop policy if exists "own_lesson_progress" on public.student_lesson_progress;
drop policy if exists "admin_profile_self" on public.admin_profiles;
create policy "student_profile_self" on public.student_profiles for select to authenticated using (id = auth.uid());
create policy "student_profile_update_self" on public.student_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "published_academic_levels_read" on public.academic_levels for select to anon, authenticated using (status = 'published');
create policy "published_courses_read" on public.courses for select to authenticated using (status = 'published');
create policy "published_lessons_read" on public.lessons for select to authenticated using (status = 'published');
create policy "published_case_law_read" on public.case_law for select to authenticated using (status = 'published');
create policy "published_pages_read" on public.site_pages for select to anon, authenticated using (status = 'published');
create policy "own_notifications_read" on public.user_notifications for select to authenticated using (user_id = auth.uid());
create policy "own_subscription_read" on public.subscriptions for select to authenticated using (student_id = auth.uid());
create policy "own_payments_read" on public.payments for select to authenticated using (student_id = auth.uid());
create policy "student_ticket_create" on public.support_tickets for insert to authenticated with check (student_id = auth.uid());
create policy "student_ticket_read" on public.support_tickets for select to authenticated using (student_id = auth.uid());
create policy "published_questions_read" on public.questions for select to authenticated using (status = 'published');
create policy "published_resources_read" on public.resources for select to authenticated using (status = 'published');
create policy "sent_notifications_read" on public.notifications for select to authenticated using (status = 'sent');
create policy "own_notifications_insert" on public.user_notifications for insert to authenticated with check (user_id = auth.uid());
create policy "own_notifications_update" on public.user_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_practice_attempts_insert" on public.practice_attempts for insert to authenticated with check (student_id = auth.uid());
create policy "own_practice_attempts_read" on public.practice_attempts for select to authenticated using (student_id = auth.uid());
create policy "own_lesson_progress" on public.student_lesson_progress for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "admin_profile_self" on public.admin_profiles for select to authenticated using (user_id = auth.uid());

-- Starter public content. These inserts are safe to run repeatedly and make the
-- user website usable immediately after a new project is initialized. Admins can
-- edit or replace every record through the relational tables without this schema
-- overwriting their changes on later runs.
insert into public.academic_levels (level, name, description, price, sort_order, status)
values
  (100, '100 Level', 'Foundation of the Nigerian legal system, legal methods and constitutional principles.', 12000, 100, 'published'),
  (200, '200 Level', 'Core study of contract, torts, property and Nigerian procedural law.', 14000, 200, 'published'),
  (300, '300 Level', 'Advanced property law, equity, company law, evidence and succession.', 16000, 300, 'published'),
  (400, '400 Level', 'Commercial, banking, intellectual property, tax and international law.', 18000, 400, 'published'),
  (500, '500 Level', 'Clinical legal education, professional ethics, arbitration and bar preparation.', 20000, 500, 'published')
on conflict (level) do nothing;

insert into public.site_pages (title, slug, content, status)
values
  (
    'Home page content',
    'home',
    '{"testimonials":[{"name":"SJ Law Student","level":"200 Level","quote":"The structured lessons and practice questions make revision much easier.","university":"Nigerian Law Student"}],"faqs":[{"question":"How does the free trial work?","answer":"Create an account to begin your trial. Your subscription status and access are managed from your account."}]}'::jsonb,
    'published'
  ),
  (
    'Pricing page content',
    'pricing',
    '{"faqs":[{"question":"Are subscriptions purchased per academic level?","answer":"Yes. Each academic level has its own subscription, so you only pay for the level you need."},{"question":"Where can I see my payments?","answer":"Your verified payments and active subscriptions are available in your account."}]}'::jsonb,
    'published'
  )
on conflict (slug) do nothing;

-- FIRST SUPER ADMIN (run once after creating this Auth user).
-- Execute this single statement separately in the Supabase SQL Editor:
-- select public.bootstrap_first_super_admin('seyiduncan40@gmail.com');

-- ADDITIONAL SUPER ADMIN (after creating this account in Authentication > Users).
-- Run separately in the Supabase SQL Editor using the postgres database role:
-- select public.grant_super_admin_by_email('adeyemisewa0@gmail.com');
-- The account must sign out and sign in again to receive its new role.

-- The existing MediaManager uses the `media` bucket. Files are private and can be
-- listed/uploaded/deleted only by admins (switch its public URLs to signed URLs).
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;
drop policy if exists "admin_media_access" on storage.objects;
create policy "admin_media_access" on storage.objects for all to authenticated using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());

-- Shared-content upgrades. ALTER TABLE also upgrades existing tables, which
-- CREATE TABLE IF NOT EXISTS above deliberately leaves intact. Keep this block
-- aligned with migrations/202609250001_shared_content.sql.
alter table public.academic_levels add column if not exists duration_months integer not null default 6 check (duration_months > 0);
alter table public.academic_levels add column if not exists objectives text[] not null default '{}';
alter table public.courses add column if not exists instructor text not null default '';
comment on column public.academic_levels.price is
  'Subscription price in Nigerian naira, including up to two decimal places. Managed through Levels & Pricing.';
comment on column public.academic_levels.duration_months is
  'Subscription duration in whole months. Used by student pricing cards and payment fulfilment.';
comment on column public.academic_levels.objectives is
  'Learning objectives entered one per line in the admin level editor.';
-- No published content is overwritten.
create table if not exists public.student_case_bookmarks (
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  case_id uuid not null references public.case_law(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, case_id)
);
alter table public.student_case_bookmarks enable row level security;
grant select, insert, delete on public.student_case_bookmarks to authenticated;
drop policy if exists own_case_bookmarks on public.student_case_bookmarks;
create policy own_case_bookmarks on public.student_case_bookmarks for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Only files attached to published resources/lessons are readable by students.
drop policy if exists published_media_read on storage.objects;
create policy published_media_read on storage.objects for select to authenticated using (
  bucket_id = 'media' and (
    exists (select 1 from public.resources r where r.status = 'published' and r.storage_path = name)
    or exists (select 1 from public.lessons l where l.status = 'published' and l.video_url = 'media:' || name)
  )
);
-- Published catalog counts do not expose lesson bodies or student details.
create or replace function public.published_catalog_counts()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'levels', (select count(*) from academic_levels where status = 'published'),
    'courses', (select count(*) from courses where status = 'published'),
    'topics', (select count(*) from lessons where status = 'published'),
    'cases', (select count(*) from case_law where status = 'published')
  );
$$;
revoke all on function public.published_catalog_counts() from public;
grant execute on function public.published_catalog_counts() to anon, authenticated;

-- Counts for public level/pricing cards, without granting access to lessons.
create or replace function public.published_level_counts()
returns table(level_id uuid, course_count bigint, topic_count bigint)
language sql stable security definer set search_path = public as $$
  select a.id, count(distinct c.id), count(l.id)
  from academic_levels a
  left join courses c on c.status = 'published' and
    (c.academic_level_id = a.id or (c.academic_level_id is null and c.academic_level in (a.level::text, a.level::text || 'L', (a.level / 100)::text)))
  left join lessons l on l.course_id = c.id and l.status = 'published'
  where a.status = 'published' group by a.id;
$$;
revoke all on function public.published_level_counts() from public;
grant execute on function public.published_level_counts() to anon, authenticated;

-- Show only notifications addressed to this student's level or subscription.
drop policy if exists sent_notifications_read on public.notifications;
create policy sent_notifications_read on public.notifications for select to authenticated using (
  status = 'sent' and (target = 'All Students' or exists (
    select 1 from public.student_profiles s where s.id = auth.uid() and (
      target = replace(s.academic_level, 'L', '') || 'L Students'
      or target = (case when s.academic_level ~ '^[1-5]$' then s.academic_level || '00L Students' else '' end)
      or (target = 'Active Subscribers' and s.subscription_status = 'active')
      or (target = 'Trial Users' and s.subscription_status = 'trial')
    )
  ))
);

-- Save exam details and its question list atomically through the admin server.
create or replace function public.save_admin_exam(exam_record jsonb, question_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = public as $$
declare saved mock_exams; question_id uuid; position integer := 0;
begin
  insert into mock_exams(id,title,description,academic_level,duration_minutes,status,opens_at,closes_at)
  values ((exam_record->>'id')::uuid, exam_record->>'title', coalesce(exam_record->>'description',''), exam_record->>'academic_level', (exam_record->>'duration_minutes')::integer, coalesce(exam_record->>'status','draft'), (exam_record->>'opens_at')::timestamptz, (exam_record->>'closes_at')::timestamptz)
  on conflict (id) do update set title=excluded.title,description=excluded.description,academic_level=excluded.academic_level,duration_minutes=excluded.duration_minutes,status=excluded.status,opens_at=excluded.opens_at,closes_at=excluded.closes_at,updated_at=now()
  returning * into saved;
  delete from mock_exam_questions where exam_id=saved.id;
  foreach question_id in array question_ids loop
    if not exists (select 1 from questions q where q.id=question_id and q.question_type='mcq') then raise exception 'Choose multiple-choice questions for this exam'; end if;
    insert into mock_exam_questions(exam_id,question_id,sort_order) values(saved.id,question_id,position);
    position := position + 1;
  end loop;
  return to_jsonb(saved) || jsonb_build_object('question_ids',to_jsonb(question_ids));
end;
$$;
revoke all on function public.save_admin_exam(jsonb,uuid[]) from public;
grant execute on function public.save_admin_exam(jsonb,uuid[]) to service_role;
drop policy if exists published_exams_read on public.mock_exams;
create policy published_exams_read on public.mock_exams for select to authenticated using (status='published');
drop policy if exists published_exam_questions_read on public.mock_exam_questions;
create policy published_exam_questions_read on public.mock_exam_questions for select to authenticated using (exists (select 1 from public.mock_exams e where e.id=exam_id and e.status='published'));

commit;
