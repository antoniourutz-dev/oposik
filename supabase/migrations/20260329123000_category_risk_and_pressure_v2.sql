begin;

create or replace function app.get_category_risk_dashboard(
  p_curriculum text default 'general',
  p_limit integer default 5,
  p_question_scope text default 'all'
)
returns table (
  category text,
  attempts bigint,
  incorrect_attempts bigint,
  raw_fail_rate numeric,
  smoothed_fail_rate numeric,
  baseline_fail_rate numeric,
  excess_risk numeric,
  sample_ok boolean,
  confidence_flag text
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 12));
  v_question_scope text := coalesce(nullif(trim(p_question_scope), ''), 'all');
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  with visible_stats as (
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
      qs.attempts::numeric as attempts,
      qs.incorrect_attempts::numeric as incorrect_attempts
    from app.practice_question_stats qs
    join public.preguntas p
      on coalesce(to_jsonb(p)->>'id', '') = qs.question_id
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and qs.attempts > 0
      and app.question_matches_scope(to_jsonb(p), v_question_scope)
  ),
  category_rollup as (
    select
      vs.category,
      sum(vs.attempts)::bigint as attempts,
      sum(vs.incorrect_attempts)::bigint as incorrect_attempts
    from visible_stats vs
    group by vs.category
  ),
  baseline as (
    select
      coalesce(
        sum(cr.incorrect_attempts)::numeric / nullif(sum(cr.attempts)::numeric, 0),
        0.25::numeric
      ) as baseline_fail_rate
    from category_rollup cr
  ),
  smoothing as (
    select
      b.baseline_fail_rate,
      greatest(1::numeric, b.baseline_fail_rate * 12.0) as alpha,
      greatest(1::numeric, (1 - b.baseline_fail_rate) * 12.0) as beta
    from baseline b
  )
  select
    cr.category,
    cr.attempts,
    cr.incorrect_attempts,
    round(
      coalesce(cr.incorrect_attempts::numeric / nullif(cr.attempts::numeric, 0), 0::numeric),
      4
    ) as raw_fail_rate,
    round(
      app.beta_smoothed_rate(
        cr.incorrect_attempts::numeric,
        cr.attempts::numeric,
        s.alpha,
        s.beta
      ),
      4
    ) as smoothed_fail_rate,
    round(s.baseline_fail_rate, 4) as baseline_fail_rate,
    round(
      app.beta_smoothed_rate(
        cr.incorrect_attempts::numeric,
        cr.attempts::numeric,
        s.alpha,
        s.beta
      ) - s.baseline_fail_rate,
      4
    ) as excess_risk,
    (cr.attempts >= 8) as sample_ok,
    app.resolve_confidence_flag(cr.attempts::integer, 8, 20) as confidence_flag
  from category_rollup cr
  cross join smoothing s
  order by excess_risk desc nulls last, attempts desc, category asc
  limit v_limit;
end;
$$;

grant execute on function app.get_category_risk_dashboard(text, integer, text) to authenticated;

create or replace function app.get_pressure_dashboard_v2(
  p_curriculum text default 'general'
)
returns table (
  learning_accuracy numeric,
  simulacro_accuracy numeric,
  pressure_gap_raw numeric,
  learning_session_n integer,
  simulacro_session_n integer,
  learning_question_n integer,
  simulacro_question_n integer,
  avg_simulacro_fatigue numeric,
  overconfidence_rate numeric,
  sample_ok boolean,
  confidence_flag text,
  recommended_mode text,
  pressure_message text
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

  return query
  with recent_learning_sessions as (
    select ps.*
    from app.practice_sessions ps
    where ps.user_id = v_user_id
      and ps.curriculum = v_curriculum
      and ps.finished_at is not null
      and ps.mode in ('standard', 'mixed', 'anti_trap', 'weakest', 'random', 'review')
    order by ps.finished_at desc
    limit 8
  ),
  recent_simulacro_sessions as (
    select ps.*
    from app.practice_sessions ps
    where ps.user_id = v_user_id
      and ps.curriculum = v_curriculum
      and ps.finished_at is not null
      and ps.mode = 'simulacro'
    order by ps.finished_at desc
    limit 5
  ),
  learning_metrics as (
    select
      case
        when count(*) = 0 then null::numeric
        else round(avg(ps.accuracy / 100.0), 4)
      end as learning_accuracy,
      count(*)::integer as learning_session_n,
      coalesce(sum(ps.total), 0)::integer as learning_question_n
    from recent_learning_sessions ps
  ),
  simulacro_metrics as (
    select
      case
        when count(*) = 0 then null::numeric
        else round(avg(ps.accuracy / 100.0), 4)
      end as simulacro_accuracy,
      count(*)::integer as simulacro_session_n,
      coalesce(sum(ps.total), 0)::integer as simulacro_question_n
    from recent_simulacro_sessions ps
  ),
  simulacro_events as (
    select
      qae.session_id,
      qae.is_correct,
      qae.response_time_ms,
      qae.changed_answer,
      row_number() over (
        partition by qae.session_id
        order by qae.answered_at asc, qae.created_at asc
      ) as rn,
      count(*) over (partition by qae.session_id) as total_in_session
    from app.question_attempt_events qae
    join recent_simulacro_sessions rss
      on rss.session_id = qae.session_id
    where qae.user_id = v_user_id
      and qae.curriculum = v_curriculum
  ),
  fatigue_per_session as (
    select
      se.session_id,
      greatest(
        0::numeric,
        coalesce(
          (
            (
              avg(case when se.rn <= ceil(se.total_in_session / 2.0) and se.is_correct then 1 else 0 end) -
              avg(case when se.rn > ceil(se.total_in_session / 2.0) and se.is_correct then 1 else 0 end)
            ) * 0.6
          ),
          0::numeric
        ) +
        coalesce(
          (
            greatest(
              0::numeric,
              (
                avg(case when se.rn > ceil(se.total_in_session / 2.0) then se.response_time_ms end) -
                avg(case when se.rn <= ceil(se.total_in_session / 2.0) then se.response_time_ms end)
              ) / nullif(avg(case when se.rn <= ceil(se.total_in_session / 2.0) then se.response_time_ms end), 0)
            ) * 0.4
          ),
          0::numeric
        )
      ) as fatigue_score
    from simulacro_events se
    group by se.session_id
  ),
  simulacro_event_metrics as (
    select
      case
        when count(*) = 0 then null::numeric
        else round(avg(least(1::numeric, fps.fatigue_score)), 4)
      end as avg_simulacro_fatigue,
      case
        when count(*) = 0 then null::numeric
        else round(
          (
            count(*) filter (
              where not se.is_correct
                and se.response_time_ms is not null
                and se.response_time_ms <= 2500
            ) +
            count(*) filter (
              where not se.is_correct
                and se.changed_answer
            )
          )::numeric / count(*)::numeric,
          4
        )
      end as overconfidence_rate
    from simulacro_events se
    left join fatigue_per_session fps
      on fps.session_id = se.session_id
  ),
  final_metrics as (
    select
      lm.learning_accuracy,
      sm.simulacro_accuracy,
      case
        when lm.learning_accuracy is null or sm.simulacro_accuracy is null then null::numeric
        else round(lm.learning_accuracy - sm.simulacro_accuracy, 4)
      end as pressure_gap_raw,
      lm.learning_session_n,
      sm.simulacro_session_n,
      lm.learning_question_n,
      sm.simulacro_question_n,
      sem.avg_simulacro_fatigue,
      sem.overconfidence_rate,
      (
        sm.simulacro_session_n >= 2 and
        sm.simulacro_question_n >= 40 and
        lm.learning_question_n >= 40
      ) as sample_ok
    from learning_metrics lm
    cross join simulacro_metrics sm
    cross join simulacro_event_metrics sem
  )
  select
    fm.learning_accuracy,
    fm.simulacro_accuracy,
    fm.pressure_gap_raw,
    fm.learning_session_n,
    fm.simulacro_session_n,
    fm.learning_question_n,
    fm.simulacro_question_n,
    fm.avg_simulacro_fatigue,
    fm.overconfidence_rate,
    fm.sample_ok,
    case
      when fm.sample_ok and fm.simulacro_session_n >= 3 and fm.simulacro_question_n >= 100 then 'high'
      when fm.sample_ok then 'medium'
      else 'low'
    end as confidence_flag,
    case
      when fm.simulacro_session_n = 0 and fm.learning_question_n >= 80 then 'simulacro'
      when fm.sample_ok and fm.pressure_gap_raw is not null and fm.pressure_gap_raw >= 0.12 then 'anti_trap'
      when fm.avg_simulacro_fatigue is not null and fm.avg_simulacro_fatigue >= 0.35 then 'mixed'
      when fm.overconfidence_rate is not null and fm.overconfidence_rate >= 0.22 then 'anti_trap'
      else null
    end as recommended_mode,
    case
      when fm.simulacro_session_n = 0 and fm.learning_question_n >= 80 then
        'Ya tienes base suficiente. Conviene medirte con un simulacro completo.'
      when not fm.sample_ok then
        'La lectura de presion aun tiene poca muestra. Necesitas mas simulacros comparables antes de sacar conclusiones fuertes.'
      when fm.pressure_gap_raw is not null and fm.pressure_gap_raw >= 0.12 then
        format(
          'Tu rendimiento cae %s puntos bajo presion. Conviene hacer anti-trampas y volver a medirte.',
          round(fm.pressure_gap_raw * 100)
        )
      when fm.avg_simulacro_fatigue is not null and fm.avg_simulacro_fatigue >= 0.35 then
        'Tu rendimiento cae al final del simulacro. Conviene reforzar bloques mixtos y ajustar mejor el ritmo.'
      when fm.overconfidence_rate is not null and fm.overconfidence_rate >= 0.22 then
        'Tus fallos rapidos pesan demasiado en examen. Baja un punto el ritmo y trabaja negaciones, plazos y literalidad.'
      when fm.simulacro_accuracy is not null then
        'La diferencia entre estudio y simulacro esta controlada. Mantiene mezcla adaptativa y una medicion periodica.'
      else
        'Todavia no hay suficiente senal de simulacro para comparar aprendizaje y examen.'
    end as pressure_message
  from final_metrics fm;
end;
$$;

grant execute on function app.get_pressure_dashboard_v2(text) to authenticated;

commit;
