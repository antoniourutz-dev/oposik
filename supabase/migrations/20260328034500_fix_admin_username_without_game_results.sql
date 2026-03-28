begin;

create or replace function app.admin_change_username(
  p_user_id uuid,
  p_new_username text,
  p_reason text default null,
  p_request_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  out_user_id uuid,
  out_old_username text,
  out_new_username text,
  out_changed_at timestamptz
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_new_username text := app.normalize_username(p_new_username);
  v_old_username text;
  v_now timestamptz := clock_timestamp();
  v_request_id uuid := coalesce(p_request_id, gen_random_uuid());
begin
  if v_actor_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not app.is_admin(v_actor_user_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'target_user_not_found' using errcode = 'P0001';
  end if;

  if p_user_id = v_actor_user_id then
    raise exception 'use_change_my_username_for_self' using errcode = '22023';
  end if;

  if not app.is_valid_username(v_new_username) then
    raise exception 'invalid_username_format'
      using errcode = '22023',
            detail = 'Use 3-32 chars: a-z, 0-9 y _.';
  end if;

  select h.user_id, h.old_username, h.new_username, h.changed_at
    into out_user_id, out_old_username, out_new_username, out_changed_at
  from app.username_change_history h
  where h.user_id = p_user_id
    and h.request_id = v_request_id;

  if found then
    return next;
    return;
  end if;

  perform 1
  from app.user_profiles up
  where up.user_id = p_user_id
  for update;

  if not found then
    raise exception 'target_user_not_found' using errcode = 'P0001';
  end if;

  select ur.username
    into v_old_username
  from app.username_registry ur
  where ur.user_id = p_user_id
    and ur.is_current = true
  for update;

  if v_old_username is null then
    raise exception 'current_username_not_found' using errcode = 'P0001';
  end if;

  if v_old_username = v_new_username then
    raise exception 'username_unchanged' using errcode = 'P0001';
  end if;

  update app.username_registry ur
  set is_current = false,
      retired_at = v_now,
      retired_by = v_actor_user_id
  where ur.user_id = p_user_id
    and ur.is_current = true;

  insert into app.username_registry (
    username,
    user_id,
    is_current,
    assigned_at,
    assigned_by,
    source,
    metadata
  )
  values (
    v_new_username,
    p_user_id,
    true,
    v_now,
    v_actor_user_id,
    'admin_panel',
    coalesce(p_metadata, '{}'::jsonb)
  );

  insert into app.username_change_history (
    user_id,
    old_username,
    new_username,
    changed_at,
    changed_by,
    source,
    reason,
    request_id,
    metadata
  )
  values (
    p_user_id,
    v_old_username,
    v_new_username,
    v_now,
    v_actor_user_id,
    'admin_panel',
    p_reason,
    v_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  if to_regclass('public.game_results') is not null then
    update public.game_results gr
    set player_name = upper(v_new_username)
    where gr.user_id = p_user_id;
  end if;

  update app.user_profiles up
  set updated_by = v_actor_user_id
  where up.user_id = p_user_id;

  return query
  select
    p_user_id as out_user_id,
    v_old_username as out_old_username,
    v_new_username as out_new_username,
    v_now as out_changed_at;

exception
  when unique_violation then
    raise exception 'username_already_taken'
      using errcode = '23505',
            detail = 'El username ya esta asignado o reservado historicamente.';
end;
$$;

grant execute on function app.admin_change_username(uuid, text, text, uuid, jsonb) to authenticated;

commit;
