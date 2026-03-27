begin;

create or replace function app.get_pressure_dashboard(
  p_curriculum text default 'general'
)
returns table (
  learning_accuracy numeric,
  simulacro_accuracy numeric,
  pressure_gap numeric,
  last_simulacro_accuracy numeric,
  last_simulacro_finished_at timestamptz,
  avg_simulacro_fatigue numeric,
  overconfidence_rate numeric,
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
  with seen_count as (
    select count(*)::integer as seen_questions
    from app.user_question_state qs
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
  ),
  recent_learning_sessions as (
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
      end as learning_accuracy
    from recent_learning_sessions ps
  ),
  simulacro_metrics as (
    select
      case
        when count(*) = 0 then null::numeric
        else round(avg(ps.accuracy / 100.0), 4)
      end as simulacro_accuracy,
      max(ps.finished_at) as last_simulacro_finished_at,
      (
        array_agg(ps.accuracy / 100.0 order by ps.finished_at desc)
      )[1]::numeric as last_simulacro_accuracy
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
  )
  select
    lm.learning_accuracy,
    sm.simulacro_accuracy,
    case
      when lm.learning_accuracy is null or sm.simulacro_accuracy is null then null::numeric
      else round(lm.learning_accuracy - sm.simulacro_accuracy, 4)
    end as pressure_gap,
    sm.last_simulacro_accuracy,
    sm.last_simulacro_finished_at,
    sem.avg_simulacro_fatigue,
    sem.overconfidence_rate,
    case
      when sm.simulacro_accuracy is null and sc.seen_questions >= 80 then 'simulacro'
      when lm.learning_accuracy is not null and sm.simulacro_accuracy is not null and (lm.learning_accuracy - sm.simulacro_accuracy) >= 0.12 then 'anti_trap'
      when sem.avg_simulacro_fatigue is not null and sem.avg_simulacro_fatigue >= 0.35 then 'mixed'
      when sem.overconfidence_rate is not null and sem.overconfidence_rate >= 0.22 then 'anti_trap'
      else null
    end as recommended_mode,
    case
      when sm.simulacro_accuracy is null and sc.seen_questions >= 80 then
        'Ya tienes base suficiente. Conviene medirte con un simulacro completo.'
      when lm.learning_accuracy is not null and sm.simulacro_accuracy is not null and (lm.learning_accuracy - sm.simulacro_accuracy) >= 0.12 then
        format(
          'Tu rendimiento cae %s puntos bajo presion. Conviene hacer anti-trampas y otro simulacro corto.',
          round((lm.learning_accuracy - sm.simulacro_accuracy) * 100)
        )
      when sem.avg_simulacro_fatigue is not null and sem.avg_simulacro_fatigue >= 0.35 then
        'Tu rendimiento cae al final del simulacro. Conviene reforzar bloques mixtos y gestionar mejor el ritmo.'
      when sem.overconfidence_rate is not null and sem.overconfidence_rate >= 0.22 then
        'Tus fallos rapidos pesan demasiado en examen. Baja un punto el ritmo y trabaja negaciones, plazos y literalidad.'
      when sm.simulacro_accuracy is not null then
        'La diferencia entre estudio y simulacro esta controlada. Mantiene mezcla adaptativa y una medicion periodica.'
      else
        'Todavia no hay suficiente senal de simulacro. El siguiente salto util es medirte en condiciones reales.'
    end as pressure_message
  from learning_metrics lm
  cross join simulacro_metrics sm
  cross join simulacro_event_metrics sem
  cross join seen_count sc;
end;
$$;

grant execute on function app.get_pressure_dashboard(text) to authenticated;

commit;
