begin;

do $$
declare
  v_user_id uuid;
  v_email text := 'admin@oposik.app';
  v_username text := 'admin';
  v_now timestamptz := timezone('utc', now());
  v_old_username text;
begin
  select au.id
    into v_user_id
  from auth.users au
  where au.email = v_email
    and au.deleted_at is null
  limit 1;

  if v_user_id is null then
    raise exception 'auth_user_not_found: create % first in Authentication > Users', v_email;
  end if;

  insert into app.user_profiles (user_id, created_by, updated_by)
  values (v_user_id, v_user_id, v_user_id)
  on conflict (user_id) do nothing;

  if exists (
    select 1
    from app.username_registry ur
    where ur.username = v_username
      and ur.user_id <> v_user_id
  ) then
    raise exception 'username_reserved_by_other_user: %', v_username;
  end if;

  select ur.username
    into v_old_username
  from app.username_registry ur
  where ur.user_id = v_user_id
    and ur.is_current = true
  limit 1;

  if v_old_username is distinct from v_username then
    update app.username_registry
    set is_current = false,
        retired_at = v_now,
        retired_by = v_user_id
    where user_id = v_user_id
      and is_current = true;

    if exists (
      select 1
      from app.username_registry ur
      where ur.username = v_username
        and ur.user_id = v_user_id
    ) then
      update app.username_registry
      set is_current = true,
          assigned_at = v_now,
          assigned_by = v_user_id,
          retired_at = null,
          retired_by = null,
          source = 'bootstrap_admin',
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('bootstrap', 'oposik_admin')
      where username = v_username
        and user_id = v_user_id;
    else
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
        v_username,
        v_user_id,
        true,
        v_now,
        v_user_id,
        'bootstrap_admin',
        jsonb_build_object('bootstrap', 'oposik_admin')
      );
    end if;

    insert into app.username_change_history (
      user_id,
      old_username,
      new_username,
      changed_at,
      changed_by,
      source,
      reason,
      metadata
    )
    values (
      v_user_id,
      v_old_username,
      v_username,
      v_now,
      v_user_id,
      'bootstrap_admin',
      'initial_admin_bootstrap',
      jsonb_build_object('bootstrap', 'oposik_admin')
    );
  end if;

  insert into app.user_roles (user_id, role, granted_by)
  values (v_user_id, 'admin', v_user_id)
  on conflict (user_id, role) do nothing;

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', v_username)
  where id = v_user_id;

  update app.user_profiles
  set updated_by = v_user_id
  where user_id = v_user_id;
end
$$;

commit;
