begin;

create or replace function app.admin_reset_user_practice_progress(
  p_user_id uuid,
  p_curriculum text default null
)
returns table (
  profiles_reset integer,
  sessions_deleted integer,
  attempts_deleted integer,
  question_stats_deleted integer,
  question_states_deleted integer,
  attempt_events_deleted integer
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_curriculum text := nullif(trim(coalesce(p_curriculum, '')), '');
  v_reset_all_curricula boolean := v_curriculum is null;
  v_profiles_reset integer := 0;
  v_sessions_deleted integer := 0;
  v_attempts_deleted integer := 0;
  v_question_stats_deleted integer := 0;
  v_question_states_deleted integer := 0;
  v_attempt_events_deleted integer := 0;
begin
  if v_actor_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not app.is_admin(v_actor_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'user_not_found' using errcode = '22023';
  end if;

  if p_user_id = v_actor_id then
    raise exception 'cannot_reset_own_progress' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from app.user_profiles up
    where up.user_id = p_user_id
  ) then
    raise exception 'user_not_found' using errcode = '22023';
  end if;

  if app.is_admin(p_user_id) then
    raise exception 'cannot_reset_admin_progress' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_sessions_deleted
  from app.practice_sessions ps
  where ps.user_id = p_user_id
    and (v_reset_all_curricula or ps.curriculum = v_curriculum);

  select count(*)::integer
  into v_attempts_deleted
  from app.practice_attempts pa
  where pa.user_id = p_user_id
    and (v_reset_all_curricula or pa.curriculum = v_curriculum);

  select count(*)::integer
  into v_question_stats_deleted
  from app.practice_question_stats qs
  where qs.user_id = p_user_id
    and (v_reset_all_curricula or qs.curriculum = v_curriculum);

  select count(*)::integer
  into v_question_states_deleted
  from app.user_question_state uqs
  where uqs.user_id = p_user_id
    and (v_reset_all_curricula or uqs.curriculum = v_curriculum);

  select count(*)::integer
  into v_attempt_events_deleted
  from app.question_attempt_events qae
  where qae.user_id = p_user_id
    and (v_reset_all_curricula or qae.curriculum = v_curriculum);

  delete from app.user_question_state uqs
  where uqs.user_id = p_user_id
    and (v_reset_all_curricula or uqs.curriculum = v_curriculum);

  delete from app.practice_question_stats qs
  where qs.user_id = p_user_id
    and (v_reset_all_curricula or qs.curriculum = v_curriculum);

  delete from app.practice_sessions ps
  where ps.user_id = p_user_id
    and (v_reset_all_curricula or ps.curriculum = v_curriculum);

  update app.practice_profiles pp
  set
    next_standard_batch_start_index = 0,
    total_answered = 0,
    total_correct = 0,
    total_incorrect = 0,
    total_sessions = 0,
    last_studied_at = null
  where pp.user_id = p_user_id
    and (v_reset_all_curricula or pp.curriculum = v_curriculum);

  get diagnostics v_profiles_reset = row_count;

  return query
  select
    v_profiles_reset,
    v_sessions_deleted,
    v_attempts_deleted,
    v_question_stats_deleted,
    v_question_states_deleted,
    v_attempt_events_deleted;
end;
$$;

grant execute on function app.admin_reset_user_practice_progress(uuid, text) to authenticated;

commit;
