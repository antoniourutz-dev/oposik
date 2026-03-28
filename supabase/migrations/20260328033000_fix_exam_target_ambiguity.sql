begin;

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
#variable_conflict use_column
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
#variable_conflict use_column
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

grant execute on function app.get_my_exam_target(text) to authenticated;
grant execute on function app.upsert_my_exam_target(text, date, integer, integer) to authenticated;

commit;
