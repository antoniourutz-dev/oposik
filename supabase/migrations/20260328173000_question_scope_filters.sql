begin;

create or replace function app.normalize_question_scope(
  p_value text
)
returns text
language plpgsql
immutable
as $$
declare
  v_value text := lower(trim(translate(coalesce(p_value, ''), 'áéíóúü', 'aeiouu')));
begin
  if v_value = '' then
    return null;
  end if;

  if v_value in ('comun', 'common', 'troncal') then
    return 'common';
  end if;

  if v_value in ('especifico', 'specific', 'especialidad') then
    return 'specific';
  end if;

  return null;
end;
$$;

create or replace function app.question_matches_scope(
  p_payload jsonb,
  p_question_scope text default 'all'
)
returns boolean
language sql
immutable
as $$
  select
    case
      when coalesce(nullif(lower(trim(p_question_scope)), ''), 'all') = 'all' then true
      else app.normalize_question_scope(
        coalesce(
          p_payload->>'question_scope',
          p_payload->>'scope',
          p_payload->>'scope_key',
          p_payload->>'temario_tipo',
          p_payload->>'tipo_temario',
          p_payload->>'question_track',
          p_payload->>'track',
          p_payload->>'tipo'
        )
      ) = app.normalize_question_scope(p_question_scope)
    end;
$$;

drop function if exists app.get_practice_catalog_summary(text);
create or replace function app.get_practice_catalog_summary(
  p_curriculum text default 'general',
  p_question_scope text default 'all'
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
  from public.preguntas p
  where coalesce(to_jsonb(p)->>'id', '') <> ''
    and app.question_matches_scope(to_jsonb(p), p_question_scope);
end;
$$;

drop function if exists app.get_standard_practice_batch(text, integer, integer);
create or replace function app.get_standard_practice_batch(
  p_curriculum text default 'general',
  p_batch_start_index integer default 0,
  p_batch_size integer default 20,
  p_question_scope text default 'all'
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
  where coalesce(to_jsonb(p)->>'id', '') <> ''
    and app.question_matches_scope(to_jsonb(p), p_question_scope)
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
    qs.last_answered_at,
    qs.last_incorrect_at
  from app.practice_question_stats qs
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
  where qs.user_id = v_user_id
    and qs.curriculum = v_curriculum
    and qs.incorrect_attempts > 0
    and app.question_matches_scope(to_jsonb(p), p_question_scope)
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

drop function if exists app.get_random_practice_batch(text, integer);
create or replace function app.get_random_practice_batch(
  p_curriculum text default 'general',
  p_batch_size integer default 20,
  p_question_scope text default 'all'
)
returns table (
  payload jsonb
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_batch_size, 20), 100));
  v_seed text := md5(clock_timestamp()::text || random()::text || coalesce(p_curriculum, 'general') || ':' || coalesce(p_question_scope, 'all'));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  select to_jsonb(p) as payload
  from public.preguntas p
  where coalesce(to_jsonb(p)->>'id', '') <> ''
    and app.question_matches_scope(to_jsonb(p), p_question_scope)
  order by md5(to_jsonb(p)::text || ':' || v_seed)
  limit v_limit;
end;
$$;

drop function if exists app.get_mixed_practice_batch(text, integer);
create or replace function app.get_mixed_practice_batch(
  p_curriculum text default 'general',
  p_batch_size integer default 20,
  p_question_scope text default 'all'
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
  v_limit integer := greatest(1, least(coalesce(p_batch_size, 20), 100));
  v_target_overdue integer := ceil(v_limit * 0.5)::integer;
  v_target_fragile integer := floor(v_limit * 0.2)::integer;
  v_target_new integer := floor(v_limit * 0.2)::integer;
  v_target_maintenance integer := greatest(0, v_limit - v_target_overdue - v_target_fragile - v_target_new);
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  with overdue as (
    select
      qs.question_id,
      'overdue'::text as bucket,
      1 as bucket_priority,
      row_number() over (
        order by qs.next_review_at asc nulls last, qs.exam_retention_probability asc, qs.p_correct_estimated asc
      ) as rn
    from app.user_question_state qs
    join public.preguntas p
      on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and qs.next_review_at is not null
      and qs.next_review_at <= timezone('utc', now())
      and app.question_matches_scope(to_jsonb(p), p_question_scope)
  ),
  fragile as (
    select
      qs.question_id,
      'fragile'::text as bucket,
      2 as bucket_priority,
      row_number() over (
        order by qs.p_correct_estimated asc, qs.exam_retention_probability asc, qs.next_review_at asc nulls last
      ) as rn
    from app.user_question_state qs
    join public.preguntas p
      on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and qs.mastery_level <= 1
      and app.question_matches_scope(to_jsonb(p), p_question_scope)
      and not exists (
        select 1
        from overdue o
        where o.question_id = qs.question_id
      )
  ),
  new_questions as (
    select
      coalesce(to_jsonb(p)->>'id', '') as question_id,
      'new'::text as bucket,
      3 as bucket_priority,
      row_number() over (
        order by
          case
            when trim(coalesce(to_jsonb(p)->>'numero', '')) ~ '^-?\d+$'
              then (to_jsonb(p)->>'numero')::integer
            else null
          end asc nulls last,
          coalesce(to_jsonb(p)->>'id', '')
      ) as rn
    from public.preguntas p
    where coalesce(to_jsonb(p)->>'id', '') <> ''
      and app.question_matches_scope(to_jsonb(p), p_question_scope)
      and not exists (
        select 1
        from app.user_question_state qs
        where qs.user_id = v_user_id
          and qs.curriculum = v_curriculum
          and qs.question_id = coalesce(to_jsonb(p)->>'id', '')
      )
  ),
  maintenance as (
    select
      qs.question_id,
      'maintenance'::text as bucket,
      4 as bucket_priority,
      row_number() over (
        order by qs.exam_retention_probability asc, qs.p_correct_estimated asc, qs.next_review_at asc nulls last
      ) as rn
    from app.user_question_state qs
    join public.preguntas p
      on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and qs.mastery_level >= 2
      and app.question_matches_scope(to_jsonb(p), p_question_scope)
      and not exists (
        select 1
        from overdue o
        where o.question_id = qs.question_id
      )
      and not exists (
        select 1
        from fragile f
        where f.question_id = qs.question_id
      )
  ),
  seed as (
    select question_id, bucket, bucket_priority, rn
    from overdue
    where rn <= v_target_overdue
    union all
    select question_id, bucket, bucket_priority, rn
    from fragile
    where rn <= v_target_fragile
    union all
    select question_id, bucket, bucket_priority, rn
    from new_questions
    where rn <= v_target_new
    union all
    select question_id, bucket, bucket_priority, rn
    from maintenance
    where rn <= v_target_maintenance
  ),
  all_candidates as (
    select question_id, bucket, bucket_priority, rn from overdue
    union all
    select question_id, bucket, bucket_priority, rn from fragile
    union all
    select question_id, bucket, bucket_priority, rn from new_questions
    union all
    select question_id, bucket, bucket_priority, rn from maintenance
  ),
  fill as (
    select
      ac.question_id,
      ac.bucket,
      ac.bucket_priority,
      row_number() over (order by ac.bucket_priority asc, ac.rn asc) as fill_rn
    from all_candidates ac
    where not exists (
      select 1
      from seed s
      where s.question_id = ac.question_id
    )
  ),
  final_selection as (
    select
      s.question_id,
      s.bucket,
      s.bucket_priority,
      s.rn as ordering
    from seed s
    union all
    select
      f.question_id,
      f.bucket,
      f.bucket_priority,
      1000 + f.fill_rn as ordering
    from fill f
    where f.fill_rn <= greatest(v_limit - (select count(*) from seed), 0)
  )
  select
    to_jsonb(p) as payload,
    fs.bucket as source_bucket
  from final_selection fs
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = fs.question_id
  where app.question_matches_scope(to_jsonb(p), p_question_scope)
  order by fs.ordering
  limit v_limit;
end;
$$;

drop function if exists app.get_anti_trap_batch(text, integer);
create or replace function app.get_anti_trap_batch(
  p_curriculum text default 'general',
  p_limit integer default 20,
  p_question_scope text default 'all'
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
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  with risky_states as (
    select
      qs.question_id,
      'state'::text as source_bucket,
      row_number() over (
        order by qs.exam_retention_probability asc, qs.p_correct_estimated asc, qs.next_review_at asc nulls last
      ) as rn
    from app.user_question_state qs
    join public.preguntas p
      on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and app.question_matches_scope(to_jsonb(p), p_question_scope)
      and (
        qs.dominant_error_type in (
          'plazo',
          'excepcion',
          'negacion',
          'literalidad',
          'distractor_cercano',
          'organo_competente',
          'confusion_entre_normas',
          'lectura_rapida',
          'sobreconfianza'
        )
        or (
          qs.mastery_level <= 1
          and app.is_anti_trap_question(to_jsonb(p))
        )
      )
  ),
  heuristic_questions as (
    select
      coalesce(to_jsonb(p)->>'id', '') as question_id,
      'heuristic'::text as source_bucket,
      row_number() over (
        order by
          case
            when trim(coalesce(to_jsonb(p)->>'numero', '')) ~ '^-?\d+$'
              then (to_jsonb(p)->>'numero')::integer
            else null
          end asc nulls last,
          coalesce(to_jsonb(p)->>'id', '')
      ) as rn
    from public.preguntas p
    where coalesce(to_jsonb(p)->>'id', '') <> ''
      and app.question_matches_scope(to_jsonb(p), p_question_scope)
      and app.is_anti_trap_question(to_jsonb(p))
  ),
  seed as (
    select rs.question_id, rs.source_bucket, rs.rn
    from risky_states rs
    where rs.rn <= ceil(v_limit * 0.7)::integer
    union all
    select hq.question_id, hq.source_bucket, 1000 + hq.rn
    from heuristic_questions hq
    where not exists (
      select 1
      from risky_states rs
      where rs.question_id = hq.question_id
    )
  )
  select
    to_jsonb(p) as payload,
    seed.source_bucket
  from seed
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = seed.question_id
  where app.question_matches_scope(to_jsonb(p), p_question_scope)
  order by seed.rn
  limit v_limit;
end;
$$;

drop function if exists app.get_simulacro_batch(text, integer);
create or replace function app.get_simulacro_batch(
  p_curriculum text default 'general',
  p_limit integer default 60,
  p_question_scope text default 'all'
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
        order by qs.exam_retention_probability asc, qs.mastery_level asc, qs.p_correct_estimated asc, random()
      ) as rn
    from app.user_question_state qs
    join public.preguntas p
      on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and app.question_matches_scope(to_jsonb(p), p_question_scope)
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
      and app.question_matches_scope(to_jsonb(p), p_question_scope)
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
  where app.question_matches_scope(to_jsonb(p), p_question_scope)
  order by d.rn
  limit v_limit;
end;
$$;

drop function if exists app.get_public_guest_practice_batch(text, integer);
create or replace function app.get_public_guest_practice_batch(
  p_curriculum text default 'general',
  p_batch_size integer default 20,
  p_question_scope text default 'common'
)
returns table (
  payload jsonb
)
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_batch_size, 20), 20));
begin
  return query
  select to_jsonb(p) as payload
  from public.preguntas p
  where coalesce(to_jsonb(p)->>'id', '') <> ''
    and app.question_matches_scope(to_jsonb(p), p_question_scope)
  order by random()
  limit v_limit;
end;
$$;

grant execute on function app.normalize_question_scope(text) to anon, authenticated;
grant execute on function app.question_matches_scope(jsonb, text) to anon, authenticated;
grant execute on function app.get_practice_catalog_summary(text, text) to authenticated;
grant execute on function app.get_standard_practice_batch(text, integer, integer, text) to authenticated;
grant execute on function app.get_weak_practice_batch(text, integer, text) to authenticated;
grant execute on function app.get_random_practice_batch(text, integer, text) to authenticated;
grant execute on function app.get_mixed_practice_batch(text, integer, text) to authenticated;
grant execute on function app.get_anti_trap_batch(text, integer, text) to authenticated;
grant execute on function app.get_simulacro_batch(text, integer, text) to authenticated;
grant execute on function app.get_public_guest_practice_batch(text, integer, text) to anon, authenticated;

commit;
