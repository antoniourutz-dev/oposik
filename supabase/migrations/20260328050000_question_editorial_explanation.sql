begin;

alter table public.preguntas
  add column if not exists explicacion_editorial text;

drop function if exists app.admin_get_weak_practice_questions(uuid, integer);
drop function if exists app.admin_get_weak_practice_questions_for_curriculum(uuid, integer, text);

create or replace function app.admin_get_weak_practice_questions_for_curriculum(
  p_user_id uuid,
  p_limit integer default 5,
  p_curriculum text default 'general'
)
returns table (
  question_id text,
  question_number integer,
  statement text,
  category text,
  explanation text,
  editorial_explanation text,
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
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
begin
  if not app.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    qs.question_id,
    qs.question_number,
    qs.statement,
    qs.category,
    qs.explanation,
    nullif(
      trim(
        coalesce(
          to_jsonb(p)->>'explicacion_editorial',
          to_jsonb(p)->>'editorial_explanation',
          to_jsonb(p)->>'resumen_editorial',
          to_jsonb(p)->>'editorial_summary',
          to_jsonb(p)->>'idea_clave',
          to_jsonb(p)->>'summary',
          to_jsonb(p)->>'resumen'
        )
      ),
      ''
    ) as editorial_explanation,
    qs.attempts,
    qs.correct_attempts,
    qs.incorrect_attempts,
    qs.last_answered_at,
    qs.last_incorrect_at
  from app.practice_question_stats qs
  left join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
  where qs.user_id = p_user_id
    and qs.curriculum = v_curriculum
  order by qs.incorrect_attempts desc, qs.last_incorrect_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 5), 50));
end;
$$;

create or replace function app.admin_get_weak_practice_questions(
  p_user_id uuid,
  p_limit integer default 5
)
returns table (
  question_id text,
  question_number integer,
  statement text,
  category text,
  explanation text,
  editorial_explanation text,
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
begin
  return query
  select *
  from app.admin_get_weak_practice_questions_for_curriculum(p_user_id, p_limit, 'general');
end;
$$;

grant execute on function app.admin_get_weak_practice_questions_for_curriculum(uuid, integer, text) to authenticated;
grant execute on function app.admin_get_weak_practice_questions(uuid, integer) to authenticated;

commit;
