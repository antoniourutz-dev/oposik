begin;

alter table app.practice_attempts
  add column if not exists response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  add column if not exists time_to_first_selection_ms integer check (time_to_first_selection_ms is null or time_to_first_selection_ms >= 0),
  add column if not exists changed_answer boolean not null default false,
  add column if not exists error_type_inferred text;

create or replace function app.compute_base_probability(
  p_attempts integer,
  p_correct_attempts integer
)
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(p_attempts, 0) <= 0 then 0.25::numeric
    else least(0.95::numeric, greatest(0.25::numeric, ((p_correct_attempts + 1)::numeric / (p_attempts + 2)::numeric)))
  end;
$$;

create or replace function app.compute_latency_factor(
  p_response_time_ms integer,
  p_reference_time_ms integer default 15000
)
returns numeric
language sql
immutable
as $$
  select case
    when p_response_time_ms is null or p_response_time_ms <= 0 then 1::numeric
    else least(1.05::numeric, greatest(0.7::numeric, p_reference_time_ms::numeric / greatest(p_response_time_ms, 1)::numeric))
  end;
$$;

create or replace function app.compute_recent_attempt_score(
  p_is_correct boolean,
  p_latency_factor numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when p_is_correct and p_latency_factor >= 1 then 1::numeric
    when p_is_correct then 0.8::numeric
    when p_latency_factor >= 1 then 0.2::numeric
    else 0::numeric
  end;
$$;

create or replace function app.compute_error_penalty(
  p_error_type text
)
returns numeric
language sql
immutable
as $$
  select case p_error_type
    when 'plazo' then 0.12::numeric
    when 'excepcion' then 0.12::numeric
    when 'negacion' then 0.12::numeric
    when 'lectura_rapida' then 0.10::numeric
    when 'sobreconfianza' then 0.10::numeric
    when 'organo_competente' then 0.09::numeric
    when 'confusion_entre_normas' then 0.09::numeric
    when 'literalidad' then 0.08::numeric
    when 'distractor_cercano' then 0.08::numeric
    else 0.04::numeric
  end;
$$;

create or replace function app.compute_estimated_probability(
  p_base_probability numeric,
  p_recent_probability numeric,
  p_latency_factor numeric,
  p_error_penalty numeric
)
returns numeric
language sql
immutable
as $$
  select least(
    0.95::numeric,
    greatest(
      0.25::numeric,
      (
        0.4::numeric * p_base_probability +
        0.3::numeric * p_recent_probability +
        0.2::numeric * (p_base_probability * p_latency_factor) +
        0.1::numeric * greatest(0.25::numeric, p_base_probability - p_error_penalty)
      )
    )
  );
$$;

create or replace function app.compute_mastery_level(
  p_attempts integer,
  p_estimated_probability numeric,
  p_consecutive_correct integer,
  p_distinct_successful_days integer,
  p_lapse_count integer
)
returns smallint
language sql
immutable
as $$
  select case
    when coalesce(p_attempts, 0) = 0 then 0::smallint
    when p_estimated_probability >= 0.85
      and coalesce(p_consecutive_correct, 0) >= 4
      and coalesce(p_distinct_successful_days, 0) >= 2
      and coalesce(p_lapse_count, 0) = 0
      then 4::smallint
    when p_estimated_probability >= 0.78
      and coalesce(p_consecutive_correct, 0) >= 3
      then 3::smallint
    when p_estimated_probability >= 0.65
      and coalesce(p_consecutive_correct, 0) >= 2
      then 2::smallint
    else 1::smallint
  end;
$$;

create or replace function app.compute_stability_score(
  p_old_stability numeric,
  p_is_correct boolean,
  p_latency_factor numeric,
  p_difficulty_factor numeric default 1
)
returns numeric
language sql
immutable
as $$
  select case
    when not p_is_correct then greatest(1::numeric, coalesce(p_old_stability, 1::numeric) * 0.45::numeric)
    else greatest(
      1::numeric,
      coalesce(p_old_stability, 1::numeric) *
      case when p_latency_factor >= 1 then 1.8::numeric else 1.45::numeric end *
      case when p_difficulty_factor < 1 then 0.95::numeric else 1::numeric end
    )
  end;
$$;

create or replace function app.compute_exam_factor(
  p_days_to_exam numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when p_days_to_exam is null then 1::numeric
    when p_days_to_exam > 120 then 1::numeric
    when p_days_to_exam > 60 then 0.9::numeric
    when p_days_to_exam > 30 then 0.8::numeric
    else 0.65::numeric
  end;
$$;

create or replace function app.compute_next_interval_days(
  p_is_correct boolean,
  p_mastery_level smallint,
  p_difficulty_factor numeric,
  p_latency_factor numeric,
  p_exam_factor numeric
)
returns integer
language sql
immutable
as $$
  select case
    when not p_is_correct then 1
    else greatest(
      1,
      round(
        (
          case coalesce(p_mastery_level, 0)
            when 0 then 1
            when 1 then 3
            when 2 then 7
            when 3 then 14
            else 21
          end
        ) * coalesce(p_difficulty_factor, 1::numeric) * coalesce(p_latency_factor, 1::numeric) * coalesce(p_exam_factor, 1::numeric)
      )::integer
    )
  end;
$$;

create or replace function app.project_exam_retention_probability(
  p_estimated_probability numeric,
  p_stability_score numeric,
  p_days_to_exam numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when p_days_to_exam is null then least(0.95::numeric, greatest(0.25::numeric, p_estimated_probability))
    else least(
      0.95::numeric,
      greatest(
        0.05::numeric,
        p_estimated_probability * exp((-1::numeric * p_days_to_exam) / greatest(coalesce(p_stability_score, 1::numeric), 1::numeric))
      )
    )
  end;
$$;

create or replace function app.compute_reviews_needed_before_exam(
  p_days_to_exam numeric,
  p_interval_days integer
)
returns integer
language sql
immutable
as $$
  select case
    when p_days_to_exam is null or p_days_to_exam <= 0 then 0
    else greatest(0, ceil(p_days_to_exam / greatest(coalesce(p_interval_days, 1), 1)::numeric)::integer - 1)
  end;
$$;

create or replace function app.record_practice_session(
  p_session_id uuid,
  p_curriculum text default 'general',
  p_mode text default 'standard',
  p_title text default 'Sesion',
  p_started_at timestamptz default timezone('utc', now()),
  p_finished_at timestamptz default timezone('utc', now()),
  p_score integer default 0,
  p_total integer default 0,
  p_batch_number integer default null,
  p_batch_size integer default null,
  p_batch_start_index integer default null,
  p_next_standard_batch_start_index integer default 0,
  p_attempts jsonb default '[]'::jsonb
)
returns void
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

  if p_mode not in ('standard', 'weakest', 'random', 'review', 'mixed', 'simulacro', 'anti_trap') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;

  perform app.ensure_practice_profile(v_user_id, v_curriculum);
  perform app.ensure_exam_target(v_user_id, v_curriculum);

  if exists (
    select 1
    from app.practice_sessions ps
    where ps.session_id = p_session_id
      and ps.user_id = v_user_id
  ) then
    return;
  end if;

  insert into app.practice_sessions (
    session_id,
    user_id,
    curriculum,
    mode,
    title,
    started_at,
    finished_at,
    score,
    total,
    batch_number,
    batch_size,
    batch_start_index,
    next_standard_batch_start_index
  )
  values (
    p_session_id,
    v_user_id,
    v_curriculum,
    p_mode,
    coalesce(nullif(trim(p_title), ''), 'Sesion'),
    p_started_at,
    p_finished_at,
    greatest(coalesce(p_score, 0), 0),
    greatest(coalesce(p_total, 0), 0),
    p_batch_number,
    p_batch_size,
    p_batch_start_index,
    greatest(coalesce(p_next_standard_batch_start_index, 0), 0)
  );

  with normalized_attempts as (
    select
      p_session_id as session_id,
      v_user_id as user_id,
      v_curriculum as curriculum,
      trim(item->>'question_id') as question_id,
      nullif(item->>'question_number', '')::integer as question_number,
      coalesce(nullif(trim(item->>'statement'), ''), 'Pregunta') as statement,
      nullif(trim(item->>'category'), '') as category,
      nullif(trim(item->>'explanation'), '') as explanation,
      nullif(trim(item->>'selected_option'), '') as selected_option,
      coalesce(nullif(trim(item->>'correct_option'), ''), 'a') as correct_option,
      coalesce((item->>'is_correct')::boolean, false) as is_correct,
      coalesce(nullif(item->>'answered_at', '')::timestamptz, p_finished_at) as answered_at,
      nullif(item->>'response_time_ms', '')::integer as response_time_ms,
      nullif(item->>'time_to_first_selection_ms', '')::integer as time_to_first_selection_ms,
      coalesce((item->>'changed_answer')::boolean, false) as changed_answer,
      nullif(trim(item->>'error_type_inferred'), '') as error_type_inferred
    from jsonb_array_elements(coalesce(p_attempts, '[]'::jsonb)) item
    where coalesce(nullif(trim(item->>'question_id'), ''), '') <> ''
  ),
  exam_target as (
    select et.exam_date
    from app.exam_targets et
    where et.user_id = v_user_id
      and et.curriculum = v_curriculum
    limit 1
  ),
  previous_state as (
    select
      na.*,
      et.exam_date,
      coalesce(uqs.attempts, 0) as prev_attempts,
      coalesce(uqs.correct_attempts, 0) as prev_correct_attempts,
      coalesce(uqs.incorrect_attempts, 0) as prev_incorrect_attempts,
      coalesce(uqs.consecutive_correct, 0) as prev_consecutive_correct,
      coalesce(uqs.consecutive_incorrect, 0) as prev_consecutive_incorrect,
      coalesce(uqs.distinct_successful_days, 0) as prev_distinct_successful_days,
      coalesce(uqs.mastery_level, 0) as prev_mastery_level,
      coalesce(uqs.stability_score, 1::numeric) as prev_stability_score,
      coalesce(uqs.retrievability_score, 0.25::numeric) as prev_retrievability_score,
      coalesce(uqs.p_correct_estimated, 0.25::numeric) as prev_p_correct_estimated,
      coalesce(uqs.avg_response_time_ms, null) as prev_avg_response_time_ms,
      coalesce(uqs.median_response_time_ms, null) as prev_median_response_time_ms,
      coalesce(uqs.fast_correct_count, 0) as prev_fast_correct_count,
      coalesce(uqs.slow_correct_count, 0) as prev_slow_correct_count,
      coalesce(uqs.lapse_count, 0) as prev_lapse_count,
      coalesce(uqs.exam_retention_probability, 0.25::numeric) as prev_exam_retention_probability,
      coalesce(uqs.reviews_needed_before_exam, 0) as prev_reviews_needed_before_exam,
      uqs.dominant_error_type as prev_dominant_error_type,
      coalesce(uqs.times_explanation_opened, 0) as prev_times_explanation_opened,
      coalesce(uqs.times_changed_answer, 0) as prev_times_changed_answer,
      uqs.last_correct_at as prev_last_correct_at,
      uqs.next_review_at as prev_next_review_at
    from normalized_attempts na
    left join exam_target et on true
    left join app.user_question_state uqs
      on uqs.user_id = na.user_id
     and uqs.curriculum = na.curriculum
     and uqs.question_id = na.question_id
  ),
  scored_attempts as (
    select
      ps.*,
      (ps.prev_attempts + 1) as next_attempts,
      (ps.prev_correct_attempts + case when ps.is_correct then 1 else 0 end) as next_correct_attempts,
      (ps.prev_incorrect_attempts + case when ps.is_correct then 0 else 1 end) as next_incorrect_attempts,
      case when ps.is_correct then ps.prev_consecutive_correct + 1 else 0 end as next_consecutive_correct,
      case when ps.is_correct then 0 else ps.prev_consecutive_incorrect + 1 end as next_consecutive_incorrect,
      case
        when ps.is_correct and (ps.prev_last_correct_at is null or ps.prev_last_correct_at::date <> ps.answered_at::date)
          then ps.prev_distinct_successful_days + 1
        else ps.prev_distinct_successful_days
      end as next_distinct_successful_days,
      app.compute_base_probability(
        ps.prev_attempts + 1,
        ps.prev_correct_attempts + case when ps.is_correct then 1 else 0 end
      ) as base_probability,
      app.compute_latency_factor(ps.response_time_ms, 15000) as latency_factor,
      app.compute_recent_attempt_score(
        ps.is_correct,
        app.compute_latency_factor(ps.response_time_ms, 15000)
      ) as recent_probability,
      app.compute_error_penalty(ps.error_type_inferred) as error_penalty,
      case
        when ps.exam_date is null then null
        else greatest(0, (ps.exam_date - ps.answered_at::date))::numeric
      end as days_to_exam
    from previous_state ps
  ),
  enriched_attempts as (
    select
      sa.*,
      app.compute_estimated_probability(
        sa.base_probability,
        sa.recent_probability,
        sa.latency_factor,
        sa.error_penalty
      ) as next_p_correct_estimated,
      case
        when not sa.is_correct and sa.prev_mastery_level >= 3 then sa.prev_lapse_count + 1
        else sa.prev_lapse_count
      end as next_lapse_count
    from scored_attempts sa
  ),
  scheduled_attempts as (
    select
      ea.*,
      app.compute_mastery_level(
        ea.next_attempts,
        ea.next_p_correct_estimated,
        ea.next_consecutive_correct,
        ea.next_distinct_successful_days,
        ea.next_lapse_count
      ) as next_mastery_level,
      app.compute_stability_score(
        ea.prev_stability_score,
        ea.is_correct,
        ea.latency_factor,
        1::numeric
      ) as next_stability_score,
      app.compute_exam_factor(ea.days_to_exam) as exam_factor
    from enriched_attempts ea
  ),
  complete_attempts as (
    select
      sa.*,
      app.compute_next_interval_days(
        sa.is_correct,
        sa.next_mastery_level,
        1::numeric,
        sa.latency_factor,
        sa.exam_factor
      ) as interval_days
    from scheduled_attempts sa
  ),
  final_state as (
    select
      ca.*,
      (ca.answered_at + make_interval(days => ca.interval_days)) as next_next_review_at,
      app.project_exam_retention_probability(
        ca.next_p_correct_estimated,
        ca.next_stability_score,
        ca.days_to_exam
      ) as next_exam_retention_probability,
      app.compute_reviews_needed_before_exam(
        ca.days_to_exam,
        ca.interval_days
      ) as next_reviews_needed_before_exam,
      case
        when ca.response_time_ms is null then ca.prev_avg_response_time_ms
        when ca.prev_avg_response_time_ms is null or ca.prev_attempts <= 0 then ca.response_time_ms
        else round((((ca.prev_avg_response_time_ms * ca.prev_attempts)::numeric) + ca.response_time_ms::numeric) / ca.next_attempts::numeric)::integer
      end as next_avg_response_time_ms,
      case
        when ca.response_time_ms is null then ca.prev_median_response_time_ms
        when ca.prev_median_response_time_ms is null then ca.response_time_ms
        else round((ca.prev_median_response_time_ms::numeric + ca.response_time_ms::numeric) / 2)::integer
      end as next_median_response_time_ms,
      ca.prev_fast_correct_count + case when ca.is_correct and ca.latency_factor >= 1 then 1 else 0 end as next_fast_correct_count,
      ca.prev_slow_correct_count + case when ca.is_correct and ca.latency_factor < 1 then 1 else 0 end as next_slow_correct_count,
      ca.prev_times_changed_answer + case when ca.changed_answer then 1 else 0 end as next_times_changed_answer,
      case
        when ca.is_correct then ca.prev_dominant_error_type
        else coalesce(ca.error_type_inferred, ca.prev_dominant_error_type, 'memoria_fragil')
      end as next_dominant_error_type
    from complete_attempts ca
  ),
  inserted_attempts as (
    insert into app.practice_attempts (
      session_id,
      user_id,
      curriculum,
      question_id,
      question_number,
      question_statement,
      category,
      explanation,
      selected_option,
      correct_option,
      is_correct,
      answered_at,
      response_time_ms,
      time_to_first_selection_ms,
      changed_answer,
      error_type_inferred
    )
    select
      fs.session_id,
      fs.user_id,
      fs.curriculum,
      fs.question_id,
      fs.question_number,
      fs.statement,
      fs.category,
      fs.explanation,
      fs.selected_option,
      fs.correct_option,
      fs.is_correct,
      fs.answered_at,
      fs.response_time_ms,
      fs.time_to_first_selection_ms,
      fs.changed_answer,
      fs.error_type_inferred
    from final_state fs
    on conflict (session_id, question_id) do nothing
    returning *
  ),
  grouped_attempts as (
    select
      ia.user_id,
      ia.curriculum,
      ia.question_id,
      max(ia.question_number) as question_number,
      max(ia.question_statement) as statement,
      max(ia.category) as category,
      max(ia.explanation) as explanation,
      count(*)::integer as attempts,
      count(*) filter (where ia.is_correct)::integer as correct_attempts,
      count(*) filter (where not ia.is_correct)::integer as incorrect_attempts,
      max(ia.answered_at) as last_answered_at,
      max(case when not ia.is_correct then ia.answered_at else null end) as last_incorrect_at
    from inserted_attempts ia
    group by ia.user_id, ia.curriculum, ia.question_id
  ),
  upserted_stats as (
    insert into app.practice_question_stats (
      user_id,
      curriculum,
      question_id,
      question_number,
      statement,
      category,
      explanation,
      attempts,
      correct_attempts,
      incorrect_attempts,
      last_answered_at,
      last_incorrect_at
    )
    select
      ga.user_id,
      ga.curriculum,
      ga.question_id,
      ga.question_number,
      ga.statement,
      ga.category,
      ga.explanation,
      ga.attempts,
      ga.correct_attempts,
      ga.incorrect_attempts,
      ga.last_answered_at,
      ga.last_incorrect_at
    from grouped_attempts ga
    on conflict (user_id, curriculum, question_id) do update
    set
      question_number = coalesce(excluded.question_number, app.practice_question_stats.question_number),
      statement = excluded.statement,
      category = excluded.category,
      explanation = excluded.explanation,
      attempts = app.practice_question_stats.attempts + excluded.attempts,
      correct_attempts = app.practice_question_stats.correct_attempts + excluded.correct_attempts,
      incorrect_attempts = app.practice_question_stats.incorrect_attempts + excluded.incorrect_attempts,
      last_answered_at = greatest(app.practice_question_stats.last_answered_at, excluded.last_answered_at),
      last_incorrect_at = case
        when excluded.last_incorrect_at is null then app.practice_question_stats.last_incorrect_at
        when app.practice_question_stats.last_incorrect_at is null then excluded.last_incorrect_at
        else greatest(app.practice_question_stats.last_incorrect_at, excluded.last_incorrect_at)
      end
    returning 1
  ),
  inserted_events as (
    insert into app.question_attempt_events (
      user_id,
      question_id,
      session_id,
      curriculum,
      answered_at,
      selected_option,
      correct_option,
      is_correct,
      response_time_ms,
      time_to_first_selection_ms,
      changed_answer,
      error_type_inferred,
      mastery_before,
      mastery_after,
      p_correct_before,
      p_correct_after,
      stability_before,
      stability_after,
      next_review_before,
      next_review_after
    )
    select
      fs.user_id,
      fs.question_id,
      fs.session_id,
      fs.curriculum,
      fs.answered_at,
      fs.selected_option,
      fs.correct_option,
      fs.is_correct,
      fs.response_time_ms,
      fs.time_to_first_selection_ms,
      fs.changed_answer,
      fs.error_type_inferred,
      fs.prev_mastery_level,
      fs.next_mastery_level,
      fs.prev_p_correct_estimated,
      fs.next_p_correct_estimated,
      fs.prev_stability_score,
      fs.next_stability_score,
      fs.prev_next_review_at,
      fs.next_next_review_at
    from final_state fs
    returning 1
  ),
  upserted_learning_state as (
    insert into app.user_question_state (
      user_id,
      question_id,
      curriculum,
      question_number,
      statement,
      category,
      explanation,
      attempts,
      correct_attempts,
      incorrect_attempts,
      consecutive_correct,
      consecutive_incorrect,
      distinct_successful_days,
      last_result,
      last_selected_option,
      last_seen_at,
      last_correct_at,
      next_review_at,
      mastery_level,
      stability_score,
      retrievability_score,
      p_correct_estimated,
      avg_response_time_ms,
      median_response_time_ms,
      last_response_time_ms,
      fast_correct_count,
      slow_correct_count,
      lapse_count,
      exam_retention_probability,
      reviews_needed_before_exam,
      dominant_error_type,
      times_explanation_opened,
      times_changed_answer
    )
    select
      fs.user_id,
      fs.question_id,
      fs.curriculum,
      fs.question_number,
      fs.statement,
      fs.category,
      fs.explanation,
      fs.next_attempts,
      fs.next_correct_attempts,
      fs.next_incorrect_attempts,
      fs.next_consecutive_correct,
      fs.next_consecutive_incorrect,
      fs.next_distinct_successful_days,
      case when fs.is_correct then 'correct' else 'incorrect' end,
      fs.selected_option,
      fs.answered_at,
      case when fs.is_correct then fs.answered_at else fs.prev_last_correct_at end,
      fs.next_next_review_at,
      fs.next_mastery_level,
      fs.next_stability_score,
      fs.next_p_correct_estimated,
      fs.next_p_correct_estimated,
      fs.next_avg_response_time_ms,
      fs.next_median_response_time_ms,
      fs.response_time_ms,
      fs.next_fast_correct_count,
      fs.next_slow_correct_count,
      fs.next_lapse_count,
      fs.next_exam_retention_probability,
      fs.next_reviews_needed_before_exam,
      fs.next_dominant_error_type,
      fs.prev_times_explanation_opened,
      fs.next_times_changed_answer
    from final_state fs
    on conflict (user_id, curriculum, question_id) do update
    set
      question_number = excluded.question_number,
      statement = excluded.statement,
      category = excluded.category,
      explanation = excluded.explanation,
      attempts = excluded.attempts,
      correct_attempts = excluded.correct_attempts,
      incorrect_attempts = excluded.incorrect_attempts,
      consecutive_correct = excluded.consecutive_correct,
      consecutive_incorrect = excluded.consecutive_incorrect,
      distinct_successful_days = excluded.distinct_successful_days,
      last_result = excluded.last_result,
      last_selected_option = excluded.last_selected_option,
      last_seen_at = excluded.last_seen_at,
      last_correct_at = excluded.last_correct_at,
      next_review_at = excluded.next_review_at,
      mastery_level = excluded.mastery_level,
      stability_score = excluded.stability_score,
      retrievability_score = excluded.retrievability_score,
      p_correct_estimated = excluded.p_correct_estimated,
      avg_response_time_ms = excluded.avg_response_time_ms,
      median_response_time_ms = excluded.median_response_time_ms,
      last_response_time_ms = excluded.last_response_time_ms,
      fast_correct_count = excluded.fast_correct_count,
      slow_correct_count = excluded.slow_correct_count,
      lapse_count = excluded.lapse_count,
      exam_retention_probability = excluded.exam_retention_probability,
      reviews_needed_before_exam = excluded.reviews_needed_before_exam,
      dominant_error_type = excluded.dominant_error_type,
      times_explanation_opened = excluded.times_explanation_opened,
      times_changed_answer = excluded.times_changed_answer
    returning 1
  ),
  session_metrics as (
    select
      count(*)::integer as questions_answered,
      count(*) filter (where is_correct)::integer as correct_count,
      count(*) filter (where not is_correct)::integer as incorrect_count,
      case
        when count(*) = 0 then 0::numeric
        else round((count(*) filter (where is_correct))::numeric / count(*)::numeric * 100, 2)
      end as accuracy,
      round(avg(response_time_ms))::integer as avg_response_time_ms,
      count(*) filter (where prev_attempts = 0)::integer as new_questions_count,
      count(*) filter (where prev_attempts > 0)::integer as review_questions_count,
      count(*) filter (where next_mastery_level > prev_mastery_level)::integer as mastery_gains,
      count(*) filter (where next_mastery_level < prev_mastery_level)::integer as mastery_losses,
      case
        when count(*) = 0 then null
        else round(avg(prev_exam_retention_probability), 4)
      end as readiness_before,
      case
        when count(*) = 0 then null
        else round(avg(next_exam_retention_probability), 4)
      end as readiness_after
    from final_state
  ),
  updated_session as (
    update app.practice_sessions ps
    set
      questions_answered = sm.questions_answered,
      correct_count = sm.correct_count,
      incorrect_count = sm.incorrect_count,
      accuracy = sm.accuracy,
      avg_response_time_ms = sm.avg_response_time_ms,
      new_questions_count = sm.new_questions_count,
      review_questions_count = sm.review_questions_count,
      mastery_gains = sm.mastery_gains,
      mastery_losses = sm.mastery_losses,
      readiness_before = sm.readiness_before,
      readiness_after = sm.readiness_after
    from session_metrics sm
    where ps.session_id = p_session_id
      and ps.user_id = v_user_id
    returning 1
  ),
  updated_profile as (
    update app.practice_profiles pp
    set
      next_standard_batch_start_index = greatest(coalesce(p_next_standard_batch_start_index, 0), 0),
      total_answered = pp.total_answered + sm.questions_answered,
      total_correct = pp.total_correct + sm.correct_count,
      total_incorrect = pp.total_incorrect + sm.incorrect_count,
      total_sessions = pp.total_sessions + 1,
      last_studied_at = greatest(coalesce(pp.last_studied_at, p_finished_at), p_finished_at)
    from session_metrics sm
    where pp.user_id = v_user_id
      and pp.curriculum = v_curriculum
    returning 1
  )
  select 1;
end;
$$;

grant execute on function app.record_practice_session(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  jsonb
) to authenticated;

commit;
