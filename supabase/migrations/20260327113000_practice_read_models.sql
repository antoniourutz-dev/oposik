begin;

create or replace function app.get_practice_catalog_summary(
  p_curriculum text default 'general'
)
returns table (
  total_questions bigint
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  select count(*)::bigint as total_questions
  from public.preguntas;
end;
$$;

create or replace function app.get_standard_practice_batch(
  p_curriculum text default 'general',
  p_batch_start_index integer default 0,
  p_batch_size integer default 20
)
returns table (
  payload jsonb
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_start integer := greatest(coalesce(p_batch_start_index, 0), 0);
  v_limit integer := greatest(1, least(coalesce(p_batch_size, 20), 100));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  select to_jsonb(p) as payload
  from public.preguntas p
  order by
    case
      when trim(coalesce(to_jsonb(p)->>'numero', '')) ~ '^-?\d+$'
        then (to_jsonb(p)->>'numero')::integer
      else null
    end asc nulls last,
    coalesce(to_jsonb(p)->>'id', '')
  offset v_start
  limit v_limit;
end;
$$;

create or replace function app.get_weak_practice_batch(
  p_curriculum text default 'general',
  p_limit integer default 5
)
returns table (
  payload jsonb,
  attempts integer,
  correct_attempts integer,
  incorrect_attempts integer,
  last_answered_at timestamptz,
  last_incorrect_at timestamptz
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 50));
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  select
    to_jsonb(p) as payload,
    qs.attempts,
    qs.correct_attempts,
    qs.incorrect_attempts,
    qs.last_answered_at,
    qs.last_incorrect_at
  from app.practice_question_stats qs
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
  where qs.user_id = v_user_id
    and qs.curriculum = v_curriculum
    and qs.incorrect_attempts > 0
  order by
    qs.incorrect_attempts desc,
    case
      when qs.attempts = 0 then 0
      else round((qs.incorrect_attempts::numeric / qs.attempts::numeric) * 1000)
    end desc,
    qs.last_incorrect_at desc nulls last
  limit v_limit;
end;
$$;

grant execute on function app.get_practice_catalog_summary(text) to authenticated;
grant execute on function app.get_standard_practice_batch(text, integer, integer) to authenticated;
grant execute on function app.get_weak_practice_batch(text, integer) to authenticated;

commit;
