begin;
-- Payment orders are immutable checkout snapshots, written only by the server.
create table if not exists public.payment_orders (
  reference text primary key,
  student_id uuid not null references public.student_profiles(id),
  academic_level_id uuid not null references public.academic_levels(id),
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  duration_months integer not null check (duration_months > 0),
  plan text not null,
  created_at timestamptz not null default now()
);
alter table public.payment_orders enable row level security;
revoke all on public.payment_orders from anon, authenticated;
grant all on public.payment_orders to service_role;

-- Lock the order and student so callback/webhook retries and concurrent renewals
-- cannot create duplicate subscriptions or lose purchased time.
create or replace function public.fulfil_paystack_payment(payment_reference text, paid_amount bigint, paid_currency text)
returns uuid language plpgsql security definer set search_path = public as $$
declare o payment_orders; sid uuid; expiry timestamptz;
begin
  select * into o from payment_orders where reference = payment_reference for update;
  if not found then raise exception 'Unknown payment order'; end if;
  if paid_amount is distinct from o.amount_kobo or paid_currency is distinct from o.currency then
    raise exception 'Payment amount or currency does not match order';
  end if;
  select subscription_id into sid from payments where reference = payment_reference;
  if found then return sid; end if;
  perform 1 from student_profiles where id = o.student_id for update;
  select greatest(now(), coalesce(max(expires_at), now())) into expiry from subscriptions
    where student_id = o.student_id and academic_level_id = o.academic_level_id and status = 'active';
  expiry := expiry + make_interval(months => o.duration_months);
  insert into subscriptions(student_id, academic_level_id, plan, status, starts_at, expires_at)
    values(o.student_id,o.academic_level_id,o.plan,'active',now(),expiry) returning id into sid;
  insert into payments(student_id,subscription_id,reference,amount,currency,plan,status,paid_at)
    values(o.student_id,sid,o.reference,o.amount_kobo / 100.0,o.currency,o.plan,'success',now());
  update student_profiles set subscription_status = 'active' where id = o.student_id;
  return sid;
end; $$;
revoke all on function public.fulfil_paystack_payment(text,bigint,text) from public, anon, authenticated;
grant execute on function public.fulfil_paystack_payment(text,bigint,text) to service_role;

-- Trial dates come from Auth creation time and cannot be extended by profile edits.
create or replace function public.has_level_access(target_level uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from student_profiles p join auth.users u on u.id=p.id
    where p.id=auth.uid() and p.is_active and (
      u.created_at + interval '3 days' > now()
      or exists(select 1 from subscriptions s where s.student_id=p.id
        and s.status in ('active','trial') and s.starts_at <= now() and s.expires_at > now()
        and (target_level is null or s.academic_level_id=target_level))
    ));
$$;
create or replace function public.has_course_access(target_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from courses c join academic_levels a on
   (a.id=c.academic_level_id or (c.academic_level_id is null and c.academic_level in (a.level::text,a.level::text||'L',(a.level/100)::text)))
   where c.id=target_course and c.status='published' and public.has_level_access(a.id));
$$;
create or replace function public.has_lesson_access(target_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from lessons l where l.id=target_lesson and l.status='published' and public.has_course_access(l.course_id));
$$;
create or replace function public.has_exam_level_access(target_level text)
returns boolean language sql stable security definer set search_path = public as $$
 select case when nullif(btrim(target_level),'') is null then public.has_level_access(null)
 else exists(select 1 from academic_levels a where target_level in (a.level::text,a.level::text||'L',(a.level/100)::text) and public.has_level_access(a.id)) end;
$$;
revoke all on function public.has_level_access(uuid), public.has_course_access(uuid), public.has_lesson_access(uuid), public.has_exam_level_access(text) from public;
grant execute on function public.has_level_access(uuid), public.has_course_access(uuid), public.has_lesson_access(uuid), public.has_exam_level_access(text) to authenticated;
-- Students may edit contact details, but not account activity or billing state.
revoke update on public.student_profiles from authenticated;
grant update(full_name,phone,university,academic_level) on public.student_profiles to authenticated;
drop policy if exists published_courses_read on public.courses;
create policy published_courses_read on public.courses for select to authenticated using (status='published' and public.has_course_access(id));
drop policy if exists published_lessons_read on public.lessons;
create policy published_lessons_read on public.lessons for select to authenticated using (status='published' and public.has_course_access(course_id));
drop policy if exists published_resources_read on public.resources;
create policy published_resources_read on public.resources for select to authenticated using (status='published' and public.has_level_access(null) and (course_id is null or public.has_course_access(course_id)) and (lesson_id is null or public.has_lesson_access(lesson_id)));
drop policy if exists published_questions_read on public.questions;
create policy published_questions_read on public.questions for select to authenticated using (status='published' and public.has_level_access(null) and (course_id is null or public.has_course_access(course_id)) and (lesson_id is null or public.has_lesson_access(lesson_id)));
drop policy if exists published_case_law_read on public.case_law;
create policy published_case_law_read on public.case_law for select to authenticated using (status='published' and public.has_level_access(null));
drop policy if exists published_exams_read on public.mock_exams;
create policy published_exams_read on public.mock_exams for select to authenticated using (status='published' and public.has_exam_level_access(academic_level));
-- Existing media and exam-question policies inherit these checks through RLS.

commit;
