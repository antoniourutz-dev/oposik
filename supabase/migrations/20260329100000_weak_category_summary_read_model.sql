begin;

create or replace function app.get_weak_category_summary(
  p_curriculum text default 'general',
  p_limit integer default 5,
  p_question_scope text default 'all'
)
returns table (
  category text,
  incorrect_attempts bigint,
  attempts bigint
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 12));
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  select
    coalesce(
      nullif(trim(qs.category), ''),
      nullif(trim(coalesce(
        to_jsonb(p)->>'category',
        to_jsonb(p)->>'tema',
        to_jsonb(p)->>'topic',
        to_jsonb(p)->>'subject',
        to_jsonb(p)->>'materia',
        to_jsonb(p)->>'subtema'
      )), ''),
      'Sin grupo'
    ) as category,
    sum(qs.incorrect_attempts)::bigint as incorrect_attempts,
    sum(qs.attempts)::bigint as attempts
  from app.practice_question_stats qs
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
  where qs.user_id = v_user_id
    and qs.curriculum = v_curriculum
    and qs.incorrect_attempts > 0
    and app.question_matches_scope(to_jsonb(p), p_question_scope)
  group by 1
  order by incorrect_attempts desc, attempts desc, category asc
  limit v_limit;
end;
$$;

grant execute on function app.get_weak_category_summary(text, integer, text) to authenticated;

commit;
