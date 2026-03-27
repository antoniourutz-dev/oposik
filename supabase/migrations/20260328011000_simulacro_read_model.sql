begin;

create or replace function app.get_simulacro_batch(
  p_curriculum text default 'general',
  p_limit integer default 60
)
returns table (
  payload jsonb,
  source_bucket text
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_limit integer := greatest(20, least(coalesce(p_limit, 60), 120));
  v_seen_limit integer := ceil(v_limit * 0.8)::integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  with seen_pool as (
    select
      qs.question_id,
      'seen'::text as source_bucket,
      row_number() over (
        order by
          qs.exam_retention_probability asc,
          qs.mastery_level asc,
          qs.p_correct_estimated asc,
          random()
      ) as rn
    from app.user_question_state qs
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
  ),
  unseen_pool as (
    select
      coalesce(to_jsonb(p)->>'id', '') as question_id,
      'new'::text as source_bucket,
      row_number() over (
        order by random()
      ) as rn
    from public.preguntas p
    where coalesce(to_jsonb(p)->>'id', '') <> ''
      and not exists (
        select 1
        from app.user_question_state qs
        where qs.user_id = v_user_id
          and qs.curriculum = v_curriculum
          and qs.question_id = coalesce(to_jsonb(p)->>'id', '')
      )
  ),
  seed as (
    select sp.question_id, sp.source_bucket, sp.rn
    from seen_pool sp
    where sp.rn <= v_seen_limit

    union all

    select up.question_id, up.source_bucket, 1000 + up.rn
    from unseen_pool up
  ),
  deduped as (
    select distinct on (s.question_id)
      s.question_id,
      s.source_bucket,
      s.rn
    from seed s
    order by s.question_id, s.rn
  )
  select
    to_jsonb(p) as payload,
    d.source_bucket
  from deduped d
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = d.question_id
  order by d.rn
  limit v_limit;
end;
$$;

grant execute on function app.get_simulacro_batch(text, integer) to authenticated;

commit;
