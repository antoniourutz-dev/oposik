create or replace function app.admin_set_challenge_start_date(
  p_start_date date,
  p_reset_before timestamptz
)
returns table (
  saved_start_date text,
  deleted_rows integer
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_deleted_rows integer := 0;
  v_saved_start_date text;
begin
  if v_actor_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not app.is_admin(v_actor_user_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_start_date is null then
    raise exception 'invalid_start_date' using errcode = '22023';
  end if;

  if p_reset_before is null then
    raise exception 'invalid_reset_cutoff' using errcode = '22023';
  end if;

  v_saved_start_date := to_char(p_start_date, 'YYYY-MM-DD');

  insert into public.korrika_app_config (
    config_key,
    config_value
  )
  values (
    'challenge_start_date',
    v_saved_start_date
  )
  on conflict (config_key) do update
    set config_value = excluded.config_value;

  delete from public.game_results gr
  where gr.played_at is null
     or gr.played_at < p_reset_before;

  get diagnostics v_deleted_rows = row_count;

  return query
  select
    v_saved_start_date,
    v_deleted_rows;
end;
$$;

grant execute on function app.admin_set_challenge_start_date(date, timestamptz) to authenticated;
