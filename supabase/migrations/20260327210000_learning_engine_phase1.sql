begin;

alter table app.practice_sessions
  drop constraint if exists practice_sessions_mode_check;

alter table app.practice_sessions
  add constraint practice_sessions_mode_check
  check (mode in ('standard', 'weakest', 'random', 'review', 'mixed', 'simulacro', 'anti_trap'));

alter table app.practice_sessions
  add column if not exists questions_answered integer not null default 0 check (questions_answered >= 0),
  add column if not exists correct_count integer not null default 0 check (correct_count >= 0),
  add column if not exists incorrect_count integer not null default 0 check (incorrect_count >= 0),
  add column if not exists accuracy numeric not null default 0 check (accuracy >= 0 and accuracy <= 100),
  add column if not exists avg_response_time_ms integer check (avg_response_time_ms is null or avg_response_time_ms >= 0),
  add column if not exists new_questions_count integer not null default 0 check (new_questions_count >= 0),
  add column if not exists review_questions_count integer not null default 0 check (review_questions_count >= 0),
  add column if not exists mastery_gains integer not null default 0,
  add column if not exists mastery_losses integer not null default 0,
  add column if not exists fatigue_score numeric check (fatigue_score is null or fatigue_score between 0 and 1),
  add column if not exists readiness_before numeric check (readiness_before is null or readiness_before between 0 and 1),
  add column if not exists readiness_after numeric check (readiness_after is null or readiness_after between 0 and 1);

update app.practice_sessions
set
  questions_answered = greatest(coalesce(total, 0), 0),
  correct_count = greatest(coalesce(score, 0), 0),
  incorrect_count = greatest(coalesce(total, 0), 0) - greatest(coalesce(score, 0), 0),
  accuracy = case
    when greatest(coalesce(total, 0), 0) = 0 then 0
    else round((greatest(coalesce(score, 0), 0)::numeric / greatest(coalesce(total, 0), 0)::numeric) * 100, 2)
  end,
  review_questions_count = greatest(coalesce(total, 0), 0)
where
  questions_answered = 0
  and correct_count = 0
  and incorrect_count = 0
  and review_questions_count = 0;

create table if not exists app.exam_targets (
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  curriculum text not null default 'general',
  exam_date date,
  daily_review_capacity integer not null default 35 check (daily_review_capacity between 5 and 200),
  daily_new_capacity integer not null default 10 check (daily_new_capacity between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, curriculum)
);

create table if not exists app.user_question_state (
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  question_id text not null,
  curriculum text not null default 'general',
  question_number integer,
  statement text not null default 'Pregunta',
  category text,
  explanation text,
  attempts integer not null default 0 check (attempts >= 0),
  correct_attempts integer not null default 0 check (correct_attempts >= 0),
  incorrect_attempts integer not null default 0 check (incorrect_attempts >= 0),
  consecutive_correct integer not null default 0 check (consecutive_correct >= 0),
  consecutive_incorrect integer not null default 0 check (consecutive_incorrect >= 0),
  distinct_successful_days integer not null default 0 check (distinct_successful_days >= 0),
  last_result text,
  last_selected_option text,
  last_seen_at timestamptz,
  last_correct_at timestamptz,
  next_review_at timestamptz,
  mastery_level smallint not null default 0 check (mastery_level between 0 and 4),
  stability_score numeric not null default 1 check (stability_score >= 1),
  retrievability_score numeric not null default 0.25 check (retrievability_score between 0 and 1),
  p_correct_estimated numeric not null default 0.25 check (p_correct_estimated between 0 and 1),
  avg_response_time_ms integer check (avg_response_time_ms is null or avg_response_time_ms >= 0),
  median_response_time_ms integer check (median_response_time_ms is null or median_response_time_ms >= 0),
  last_response_time_ms integer check (last_response_time_ms is null or last_response_time_ms >= 0),
  fast_correct_count integer not null default 0 check (fast_correct_count >= 0),
  slow_correct_count integer not null default 0 check (slow_correct_count >= 0),
  lapse_count integer not null default 0 check (lapse_count >= 0),
  exam_retention_probability numeric not null default 0.25 check (exam_retention_probability between 0 and 1),
  reviews_needed_before_exam integer not null default 0 check (reviews_needed_before_exam >= 0),
  dominant_error_type text,
  times_explanation_opened integer not null default 0 check (times_explanation_opened >= 0),
  times_changed_answer integer not null default 0 check (times_changed_answer >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, curriculum, question_id),
  constraint user_question_state_last_result_chk
    check (last_result is null or last_result in ('correct', 'incorrect')),
  constraint user_question_state_last_selected_option_chk
    check (last_selected_option is null or last_selected_option in ('a', 'b', 'c', 'd'))
);

create table if not exists app.question_attempt_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  question_id text not null,
  session_id uuid not null references app.practice_sessions(session_id) on delete cascade,
  curriculum text not null default 'general',
  answered_at timestamptz not null default timezone('utc', now()),
  selected_option text,
  correct_option text not null,
  is_correct boolean not null,
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  time_to_first_selection_ms integer check (time_to_first_selection_ms is null or time_to_first_selection_ms >= 0),
  changed_answer boolean not null default false,
  error_type_inferred text,
  mastery_before smallint check (mastery_before is null or mastery_before between 0 and 4),
  mastery_after smallint check (mastery_after is null or mastery_after between 0 and 4),
  p_correct_before numeric check (p_correct_before is null or p_correct_before between 0 and 1),
  p_correct_after numeric check (p_correct_after is null or p_correct_after between 0 and 1),
  stability_before numeric check (stability_before is null or stability_before >= 1),
  stability_after numeric check (stability_after is null or stability_after >= 1),
  next_review_before timestamptz,
  next_review_after timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint question_attempt_events_selected_option_chk
    check (selected_option is null or selected_option in ('a', 'b', 'c', 'd')),
  constraint question_attempt_events_correct_option_chk
    check (correct_option in ('a', 'b', 'c', 'd'))
);

create index if not exists idx_exam_targets_curriculum
  on app.exam_targets (curriculum, exam_date);

create index if not exists idx_user_question_state_next_review
  on app.user_question_state (user_id, curriculum, next_review_at asc nulls last);

create index if not exists idx_user_question_state_mastery
  on app.user_question_state (user_id, curriculum, mastery_level desc, exam_retention_probability asc);

create index if not exists idx_user_question_state_error
  on app.user_question_state (user_id, curriculum, dominant_error_type);

create index if not exists idx_question_attempt_events_user_answered_at
  on app.question_attempt_events (user_id, curriculum, answered_at desc);

create index if not exists idx_question_attempt_events_question
  on app.question_attempt_events (user_id, curriculum, question_id, answered_at desc);

create or replace function app.touch_learning_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_exam_targets_updated_at on app.exam_targets;
create trigger trg_touch_exam_targets_updated_at
before update on app.exam_targets
for each row execute function app.touch_learning_updated_at();

drop trigger if exists trg_touch_user_question_state_updated_at on app.user_question_state;
create trigger trg_touch_user_question_state_updated_at
before update on app.user_question_state
for each row execute function app.touch_learning_updated_at();

create or replace function app.ensure_exam_target(
  p_user_id uuid,
  p_curriculum text default 'general'
)
returns app.exam_targets
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_target app.exam_targets;
begin
  insert into app.exam_targets (user_id, curriculum)
  values (p_user_id, v_curriculum)
  on conflict (user_id, curriculum) do nothing;

  select *
    into v_target
  from app.exam_targets
  where user_id = p_user_id
    and curriculum = v_curriculum;

  return v_target;
end;
$$;

create or replace function app.get_my_exam_target(
  p_curriculum text default 'general'
)
returns table (
  user_id uuid,
  curriculum text,
  exam_date date,
  daily_review_capacity integer,
  daily_new_capacity integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform app.ensure_exam_target(v_user_id, v_curriculum);

  return query
  select
    et.user_id,
    et.curriculum,
    et.exam_date,
    et.daily_review_capacity,
    et.daily_new_capacity,
    et.updated_at
  from app.exam_targets et
  where et.user_id = v_user_id
    and et.curriculum = v_curriculum;
end;
$$;

create or replace function app.upsert_my_exam_target(
  p_curriculum text default 'general',
  p_exam_date date default null,
  p_daily_review_capacity integer default 35,
  p_daily_new_capacity integer default 10
)
returns table (
  user_id uuid,
  curriculum text,
  exam_date date,
  daily_review_capacity integer,
  daily_new_capacity integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_daily_review_capacity integer := greatest(coalesce(p_daily_review_capacity, 35), 5);
  v_daily_new_capacity integer := greatest(coalesce(p_daily_new_capacity, 10), 0);
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into app.exam_targets (
    user_id,
    curriculum,
    exam_date,
    daily_review_capacity,
    daily_new_capacity
  )
  values (
    v_user_id,
    v_curriculum,
    p_exam_date,
    v_daily_review_capacity,
    v_daily_new_capacity
  )
  on conflict (user_id, curriculum) do update
  set
    exam_date = excluded.exam_date,
    daily_review_capacity = excluded.daily_review_capacity,
    daily_new_capacity = excluded.daily_new_capacity;

  return query
  select
    et.user_id,
    et.curriculum,
    et.exam_date,
    et.daily_review_capacity,
    et.daily_new_capacity,
    et.updated_at
  from app.exam_targets et
  where et.user_id = v_user_id
    and et.curriculum = v_curriculum;
end;
$$;

grant select on app.user_question_state to authenticated;
grant select on app.question_attempt_events to authenticated;
grant select, insert, update on app.exam_targets to authenticated;

alter table app.exam_targets enable row level security;
alter table app.user_question_state enable row level security;
alter table app.question_attempt_events enable row level security;

drop policy if exists exam_targets_select_self_or_admin on app.exam_targets;
create policy exam_targets_select_self_or_admin
on app.exam_targets
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

drop policy if exists exam_targets_insert_self_or_admin on app.exam_targets;
create policy exam_targets_insert_self_or_admin
on app.exam_targets
for insert
to authenticated
with check (user_id = auth.uid() or app.is_admin());

drop policy if exists exam_targets_update_self_or_admin on app.exam_targets;
create policy exam_targets_update_self_or_admin
on app.exam_targets
for update
to authenticated
using (user_id = auth.uid() or app.is_admin())
with check (user_id = auth.uid() or app.is_admin());

drop policy if exists user_question_state_select_self_or_admin on app.user_question_state;
create policy user_question_state_select_self_or_admin
on app.user_question_state
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

drop policy if exists question_attempt_events_select_self_or_admin on app.question_attempt_events;
create policy question_attempt_events_select_self_or_admin
on app.question_attempt_events
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

grant execute on function app.ensure_exam_target(uuid, text) to authenticated;
grant execute on function app.get_my_exam_target(text) to authenticated;
grant execute on function app.upsert_my_exam_target(text, date, integer, integer) to authenticated;

commit;
