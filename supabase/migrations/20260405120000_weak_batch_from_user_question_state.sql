begin;

-- get_weak_practice_batch leía practice_question_stats, que solo se rellena con record_practice_session.
-- La app sincroniza con sync-practice-session → user_question_state. Sin esto el repaso de falladas
-- quedaba congelado y siempre devolvía las mismas filas.

drop function if exists app.get_weak_practice_batch(text, integer, text);
drop function if exists app.get_weak_practice_batch(text, integer);

create or replace function app.get_weak_practice_batch(
  p_curriculum text default 'general',
  p_limit integer default 5,
  p_question_scope text default 'all'
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
    qs.last_seen_at as last_answered_at,
    case
      when qs.last_result = 'incorrect' then qs.last_seen_at
      else null
    end as last_incorrect_at
  from app.user_question_state qs
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
  where qs.user_id = v_user_id
    and qs.curriculum = v_curriculum
    and qs.attempts > 0
    and qs.incorrect_attempts > 0
    and app.question_matches_scope(to_jsonb(p), p_question_scope)
    and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
  order by
    case when qs.last_result = 'incorrect' then 0 else 1 end,
    qs.mastery_level asc,
    qs.p_correct_estimated asc,
    (qs.incorrect_attempts::numeric / greatest(qs.attempts, 1)) desc,
    qs.incorrect_attempts desc,
    qs.last_seen_at desc nulls last
  limit v_limit;
end;
$$;

grant execute on function app.get_weak_practice_batch(text, integer, text) to authenticated;

commit;
