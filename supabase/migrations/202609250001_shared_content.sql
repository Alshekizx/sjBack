begin;
alter table public.academic_levels add column if not exists duration_months integer not null default 6 check (duration_months > 0);
alter table public.academic_levels add column if not exists objectives text[] not null default '{}';
alter table public.courses add column if not exists instructor text not null default '';
-- Apply after schema.sql. No published content is overwritten.
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
