begin;

-- Aísla el catálogo por currículo de práctica: `leyes_generales` solo ve filas explícitas;
-- oposiciones siguen viendo filas legacy (curriculum null) o su clave.
create or replace function app.pregunta_row_matches_practice_curriculum(
  p public.preguntas,
  v_curriculum text
) returns boolean
language plpgsql
stable
as $$
declare
  v_norm text := coalesce(nullif(trim(v_curriculum), ''), 'general');
  pk text := coalesce(
    nullif(trim((p).curriculum_key::text), ''),
    nullif(trim(to_jsonb(p)->>'curriculum'), '')
  );
begin
  if v_norm = 'leyes_generales' then
    return coalesce(pk, '') = 'leyes_generales';
  end if;
  if coalesce(pk, '') = 'leyes_generales' then
    return false;
  end if;
  return pk is null or pk = '' or pk = v_norm;
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
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  select to_jsonb(p) as payload
  from public.preguntas p
  where coalesce(to_jsonb(p)->>'id', '') <> ''
    and app.question_matches_scope(to_jsonb(p), p_question_scope)
    and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
  order by md5(to_jsonb(p)::text || ':' || v_seed)
  limit v_limit;
end;
$$;

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
    qs.last_answered_at,
    qs.last_incorrect_at
  from app.practice_question_stats qs
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
  where qs.user_id = v_user_id
    and qs.curriculum = v_curriculum
    and qs.incorrect_attempts > 0
    and app.question_matches_scope(to_jsonb(p), p_question_scope)
    and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
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

grant execute on function app.get_weak_practice_batch(text, integer, text) to authenticated;

drop function if exists app.get_law_practice_batch(text, text, integer);
create or replace function app.get_law_practice_batch(
  p_law text,
  p_curriculum text default 'general',
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
  v_limit integer := greatest(1, least(coalesce(p_batch_size, 20), 100));
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  select to_jsonb(p) as payload
  from public.preguntas p
  where coalesce(to_jsonb(p)->>'id', '') <> ''
    and to_jsonb(p)->>'ley_referencia' = p_law
    and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
  order by random()
  limit v_limit;
end;
$$;

grant execute on function app.get_law_practice_batch(text, text, integer) to authenticated;

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
      and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
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
      and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
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
      and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
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
      and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
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
    and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
  order by fs.ordering
  limit v_limit;
end;
$$;

grant execute on function app.get_mixed_practice_batch(text, integer, text) to authenticated;

drop function if exists app.get_readiness_dashboard_v2(text);
drop function if exists app.get_readiness_dashboard_v2(text, uuid);

create or replace function app.get_readiness_dashboard_v2(
  p_curriculum text default 'general',
  p_user_id uuid default null
)
returns table (
  total_questions integer,
  seen_questions integer,
  coverage_rate numeric,
  observed_accuracy_rate numeric,
  observed_accuracy_n integer,
  observed_accuracy_ci_low numeric,
  observed_accuracy_ci_high numeric,
  observed_accuracy_sample_ok boolean,
  retention_seen_rate numeric,
  retention_seen_n integer,
  retention_seen_confidence_flag text,
  unseen_prior_rate numeric,
  exam_readiness_rate numeric,
  exam_readiness_ci_low numeric,
  exam_readiness_ci_high numeric,
  exam_readiness_confidence_flag text,
  backlog_overdue_count integer,
  fragile_count integer,
  consolidating_count integer,
  solid_count integer,
  mastered_count integer,
  recommended_review_count integer,
  recommended_new_count integer,
  recommended_today_count integer,
  recommended_mode text,
  focus_message text,
  law_breakdown jsonb,
  topic_breakdown jsonb
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid;
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_unseen_prior numeric := 0.25;
begin
  v_user_id := coalesce(p_user_id, auth.uid());
  if v_user_id is null then
    raise exception 'No user';
  end if;

  return query
  with
  target as (
    select
      et.exam_date::date as exam_date,
      coalesce(et.daily_review_capacity, 35)::integer as daily_review_capacity,
      coalesce(et.daily_new_capacity, 10)::integer as daily_new_capacity,
      greatest(
        0,
        coalesce(et.exam_date::date - timezone('utc', now())::date, 0)
      )::integer as days_to_exam
    from app.exam_targets et
    where et.user_id = v_user_id
      and et.curriculum = v_curriculum
    limit 1
  ),
  catalog as (
    select count(*)::integer as total_questions
    from public.preguntas p
    where coalesce(to_jsonb(p)->>'id', '') <> ''
      and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
  ),
  state_metrics as (
    select
      count(*)::integer as seen_questions,
      coalesce(sum(qs.attempts), 0)::integer as observed_accuracy_n,
      coalesce(sum(qs.correct_attempts), 0)::integer as observed_accuracy_successes,
      count(*) filter (
        where qs.next_review_at is not null
          and qs.next_review_at <= timezone('utc', now())
      )::integer as overdue_count,
      count(*) filter (where qs.mastery_level <= 1)::integer as fragile_count,
      count(*) filter (where qs.mastery_level = 2)::integer as consolidating_count,
      count(*) filter (where qs.mastery_level = 3)::integer as solid_count,
      count(*) filter (where qs.mastery_level >= 4)::integer as mastered_count,
      coalesce(
        sum(
          app.project_exam_retention_probability(
            qs.p_correct_estimated,
            qs.stability_score,
            (select coalesce(t.days_to_exam, 0) from target t limit 1)
          )
        ),
        0::numeric
      ) as retention_sum
    from app.user_question_state qs
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
  ),
  law_breakdown_data as (
    select
      to_jsonb(p)->>'ley_referencia' as ley_referencia,
      min(
        coalesce(
          to_jsonb(p)->>'grupo',
          to_jsonb(p)->>'question_scope',
          to_jsonb(p)->>'scope',
          to_jsonb(p)->>'temario_tipo',
          to_jsonb(p)->>'tipo_temario'
        )
      ) as raw_scope,
      count(distinct coalesce(to_jsonb(p)->>'id', ''))::integer as question_count,
      count(
        distinct case
          when qs.mastery_level >= 3 then coalesce(to_jsonb(p)->>'id', '')
          else null
        end
      )::integer as consolidated_count,
      coalesce(sum(qs.attempts), 0)::integer as attempts,
      coalesce(sum(qs.correct_attempts), 0)::integer as correct_attempts,
      case
        when coalesce(sum(qs.attempts), 0) = 0 then 0::numeric
        else round(
          coalesce(sum(qs.correct_attempts), 0)::numeric /
          coalesce(sum(qs.attempts), 1)::numeric,
          4
        )
      end as accuracy_rate
    from public.preguntas p
    left join app.user_question_state qs
      on qs.question_id = coalesce(to_jsonb(p)->>'id', '')
      and qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
    where coalesce(to_jsonb(p)->>'id', '') <> ''
      and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
      and coalesce(to_jsonb(p)->>'ley_referencia', '') <> ''
    group by 1
  ),
  topic_breakdown_data as (
    select
      btrim(to_jsonb(p)->>'temario_pregunta') as topic_label,
      coalesce(
        to_jsonb(p)->>'grupo',
        to_jsonb(p)->>'question_scope',
        to_jsonb(p)->>'scope',
        to_jsonb(p)->>'temario_tipo',
        to_jsonb(p)->>'tipo_temario'
      ) as raw_scope,
      count(distinct coalesce(to_jsonb(p)->>'id', ''))::integer as question_count,
      count(
        distinct case
          when qs.mastery_level >= 3 then coalesce(to_jsonb(p)->>'id', '')
          else null
        end
      )::integer as consolidated_count,
      coalesce(sum(qs.attempts), 0)::integer as attempts,
      coalesce(sum(qs.correct_attempts), 0)::integer as correct_attempts,
      case
        when coalesce(sum(qs.attempts), 0) = 0 then 0::numeric
        else round(
          coalesce(sum(qs.correct_attempts), 0)::numeric /
          coalesce(sum(qs.attempts), 1)::numeric,
          4
        )
      end as accuracy_rate
    from public.preguntas p
    left join app.user_question_state qs
      on qs.question_id = coalesce(to_jsonb(p)->>'id', '')
      and qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
    where coalesce(to_jsonb(p)->>'id', '') <> ''
      and app.pregunta_row_matches_practice_curriculum(p, v_curriculum)
      and coalesce(btrim(to_jsonb(p)->>'temario_pregunta'), '') <> ''
    group by 1, 2
  ),
  composed as (
    select
      catalog.total_questions,
      state_metrics.seen_questions,
      state_metrics.observed_accuracy_n,
      state_metrics.observed_accuracy_successes,
      state_metrics.overdue_count,
      state_metrics.fragile_count,
      state_metrics.consolidating_count,
      state_metrics.solid_count,
      state_metrics.mastered_count,
      coalesce((select t.daily_review_capacity from target t limit 1), 35)::integer as daily_review_capacity,
      coalesce((select t.daily_new_capacity from target t limit 1), 10)::integer as daily_new_capacity,
      greatest(catalog.total_questions - state_metrics.seen_questions, 0) as unseen_questions,
      case
        when catalog.total_questions <= 0 then 0::numeric
        else round(
          state_metrics.seen_questions::numeric / catalog.total_questions::numeric,
          4
        )
      end as coverage_rate_value,
      case
        when state_metrics.observed_accuracy_n <= 0 then 0::numeric
        else round(
          state_metrics.observed_accuracy_successes::numeric /
          state_metrics.observed_accuracy_n::numeric,
          4
        )
      end as observed_accuracy_rate_value,
      case
        when state_metrics.seen_questions <= 0 then null::numeric
        else round(
          state_metrics.retention_sum / state_metrics.seen_questions::numeric,
          4
        )
      end as retention_seen_rate_value,
      case
        when catalog.total_questions <= 0 then v_unseen_prior
        else round(
          (
            state_metrics.retention_sum +
            (greatest(catalog.total_questions - state_metrics.seen_questions, 0)::numeric * v_unseen_prior)
          ) / catalog.total_questions::numeric,
          4
        )
      end as exam_readiness_rate_value
    from catalog
    cross join state_metrics
  )
  select
    composed.total_questions,
    composed.seen_questions,
    composed.coverage_rate_value,
    composed.observed_accuracy_rate_value,
    composed.observed_accuracy_n,
    round(app.wilson_interval_low(composed.observed_accuracy_successes, composed.observed_accuracy_n), 4) as observed_accuracy_ci_low,
    round(app.wilson_interval_high(composed.observed_accuracy_successes, composed.observed_accuracy_n), 4) as observed_accuracy_ci_high,
    composed.observed_accuracy_n >= 30 as observed_accuracy_sample_ok,
    composed.retention_seen_rate_value,
    composed.seen_questions as retention_seen_n,
    app.resolve_confidence_flag(composed.seen_questions, 20, 80) as retention_seen_confidence_flag,
    v_unseen_prior as unseen_prior_rate,
    composed.exam_readiness_rate_value,
    case
      when composed.seen_questions < 5 then null::numeric
      else round(
        greatest(
          0::numeric,
          composed.exam_readiness_rate_value -
          least(0.12::numeric, 0.35::numeric / sqrt(composed.seen_questions::numeric))
        ),
        4
      )
    end as exam_readiness_ci_low,
    case
      when composed.seen_questions < 5 then null::numeric
      else round(
        least(
          1::numeric,
          composed.exam_readiness_rate_value +
          least(0.12::numeric, 0.35::numeric / sqrt(composed.seen_questions::numeric))
        ),
        4
      )
    end as exam_readiness_ci_high,
    app.resolve_confidence_flag(composed.seen_questions, 20, 80) as exam_readiness_confidence_flag,
    composed.overdue_count as backlog_overdue_count,
    composed.fragile_count,
    composed.consolidating_count,
    composed.solid_count,
    composed.mastered_count,
    case
      when composed.overdue_count > 0 then least(composed.daily_review_capacity, composed.overdue_count)
      when composed.fragile_count > 0 then least(composed.daily_review_capacity, composed.fragile_count)
      else 0
    end as recommended_review_count,
    case
      when composed.overdue_count >= composed.daily_review_capacity then 0
      else least(composed.daily_new_capacity, composed.unseen_questions)
    end as recommended_new_count,
    (
      case
        when composed.overdue_count > 0 then least(composed.daily_review_capacity, composed.overdue_count)
        when composed.fragile_count > 0 then least(composed.daily_review_capacity, composed.fragile_count)
        else 0
      end
      +
      case
        when composed.overdue_count >= composed.daily_review_capacity then 0
        else least(composed.daily_new_capacity, composed.unseen_questions)
      end
    ) as recommended_today_count,
    case
      when composed.overdue_count > 0 then 'mixed'
      when composed.fragile_count >= greatest(4, composed.daily_review_capacity / 2) then 'mixed'
      when composed.unseen_questions > 0 then 'standard'
      else 'random'
    end as recommended_mode,
    case
      when composed.seen_questions < 20 then format(
        'La muestra aun es corta. Has visto %s preguntas y conviene seguir consolidando antes de leer demasiado la prediccion.',
        composed.seen_questions
      )
      when composed.overdue_count > 0 then format(
        'Tienes %s preguntas vencidas. Hoy conviene priorizar %s y dejar que la prediccion respire sobre una base mas limpia.',
        composed.overdue_count,
        least(composed.daily_review_capacity, composed.overdue_count)
      )
      when composed.fragile_count > 0 then format(
        'La preparacion compuesta mejora si consolidas %s fragiles y abres %s nuevas con control.',
        least(composed.daily_review_capacity, composed.fragile_count),
        least(composed.daily_new_capacity, composed.unseen_questions)
      )
      when composed.unseen_questions > 0 then format(
        'La cobertura ya permite avanzar con %s nuevas sin distorsionar demasiado la lectura global.',
        least(composed.daily_new_capacity, composed.unseen_questions)
      )
      else 'La cobertura esta practicamente cerrada. La lectura de preparacion depende sobre todo de mantenimiento y transferencia.'
    end as focus_message,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'ley_referencia', lbd.ley_referencia,
            'raw_scope', lbd.raw_scope,
            'question_count', lbd.question_count,
            'consolidated_count', lbd.consolidated_count,
            'attempts', lbd.attempts,
            'correct_attempts', lbd.correct_attempts,
            'accuracy_rate', lbd.accuracy_rate
          )
          order by lbd.attempts desc, lbd.ley_referencia
        ),
        '[]'::jsonb
      )
      from law_breakdown_data lbd
    ) as law_breakdown,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'topic_label', tbd.topic_label,
            'raw_scope', tbd.raw_scope,
            'question_count', tbd.question_count,
            'consolidated_count', tbd.consolidated_count,
            'attempts', tbd.attempts,
            'correct_attempts', tbd.correct_attempts,
            'accuracy_rate', tbd.accuracy_rate
          )
          order by tbd.topic_label
        ),
        '[]'::jsonb
      )
      from topic_breakdown_data tbd
    ) as topic_breakdown
  from composed;
end;
$$;

grant execute on function app.get_readiness_dashboard_v2(text, uuid) to authenticated;

commit;
