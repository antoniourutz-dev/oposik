begin;

create or replace function app.get_random_practice_batch(
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
  v_seed text := md5(clock_timestamp()::text || random()::text || coalesce(p_curriculum, 'general'));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  select to_jsonb(p) as payload
  from public.preguntas p
  order by md5(to_jsonb(p)::text || ':' || v_seed)
  limit v_limit;
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
returns table (
  user_id uuid,
  curriculum text,
  next_standard_batch_start_index integer,
  total_answered integer,
  total_correct integer,
  total_incorrect integer,
  total_sessions integer,
  last_studied_at timestamptz
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

  if p_mode not in ('standard', 'weakest', 'random') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;

  perform app.ensure_practice_profile(v_user_id, v_curriculum);

  if exists (
    select 1
    from app.practice_sessions ps
    where ps.session_id = p_session_id
      and ps.user_id = v_user_id
  ) then
    return query
    select
      pp.user_id,
      pp.curriculum,
      pp.next_standard_batch_start_index,
      pp.total_answered,
      pp.total_correct,
      pp.total_incorrect,
      pp.total_sessions,
      pp.last_studied_at
    from app.practice_profiles pp
    where pp.user_id = v_user_id
      and pp.curriculum = v_curriculum;
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
      coalesce((item->>'is_correct')::boolean, false) as is_correct
    from jsonb_array_elements(coalesce(p_attempts, '[]'::jsonb)) item
    where coalesce(nullif(trim(item->>'question_id'), ''), '') <> ''
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
      answered_at
    )
    select
      na.session_id,
      na.user_id,
      na.curriculum,
      na.question_id,
      na.question_number,
      na.statement,
      na.category,
      na.explanation,
      na.selected_option,
      na.correct_option,
      na.is_correct,
      p_finished_at
    from normalized_attempts na
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
  )
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
    end;

  update app.practice_profiles pp
  set
    next_standard_batch_start_index = greatest(coalesce(p_next_standard_batch_start_index, 0), 0),
    total_answered = pp.total_answered + greatest(coalesce(p_total, 0), 0),
    total_correct = pp.total_correct + greatest(coalesce(p_score, 0), 0),
    total_incorrect = pp.total_incorrect + greatest(coalesce(p_total, 0), 0) - greatest(coalesce(p_score, 0), 0),
    total_sessions = pp.total_sessions + 1,
    last_studied_at = greatest(coalesce(pp.last_studied_at, p_finished_at), p_finished_at)
  where pp.user_id = v_user_id
    and pp.curriculum = v_curriculum;

  return query
  select
    pp.user_id,
    pp.curriculum,
    pp.next_standard_batch_start_index,
    pp.total_answered,
    pp.total_correct,
    pp.total_incorrect,
    pp.total_sessions,
    pp.last_studied_at
  from app.practice_profiles pp
  where pp.user_id = v_user_id
    and pp.curriculum = v_curriculum;
end;
$$;

grant execute on function app.get_random_practice_batch(text, integer) to authenticated;

commit;
