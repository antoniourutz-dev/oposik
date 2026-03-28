begin;

alter table app.user_profiles
  add column if not exists player_mode text;

update app.user_profiles
set player_mode = 'advanced'
where player_mode is null;

alter table app.user_profiles
  alter column player_mode set default 'advanced';

alter table app.user_profiles
  alter column player_mode set not null;

alter table app.user_profiles
  drop constraint if exists user_profiles_player_mode_chk;

alter table app.user_profiles
  add constraint user_profiles_player_mode_chk
  check (player_mode in ('advanced', 'generic'));

drop function if exists app.get_my_account_identity();

create or replace function app.get_my_account_identity()
returns table (
  user_id uuid,
  current_username text,
  is_admin boolean,
  player_mode text,
  previous_usernames text[]
)
language sql
security definer
set search_path = app, public
as $$
  select
    current_row.user_id,
    current_row.username as current_username,
    app.is_admin(auth.uid()) as is_admin,
    coalesce(up.player_mode, 'advanced')::text as player_mode,
    coalesce(
      (
        select array_agg(history.username order by history.assigned_at desc)
        from app.username_registry history
        where history.user_id = current_row.user_id
          and history.is_current = false
      ),
      '{}'::text[]
    ) as previous_usernames
  from app.username_registry current_row
  left join app.user_profiles up
    on up.user_id = current_row.user_id
  where current_row.user_id = auth.uid()
    and current_row.is_current = true;
$$;

drop function if exists app.admin_list_users(text, integer);

create or replace function app.admin_list_users(
  p_search text default null,
  p_limit integer default 50
)
returns table (
  user_id uuid,
  current_username text,
  auth_email text,
  is_admin boolean,
  status text,
  player_mode text,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz,
  previous_usernames text[],
  rename_count bigint,
  self_service_change_count bigint,
  admin_change_count bigint,
  total_sessions bigint,
  total_answered bigint,
  total_correct bigint,
  total_incorrect bigint,
  accuracy integer,
  last_studied_at timestamptz
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_search text := nullif(app.normalize_username(p_search), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if v_actor_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not app.is_admin(v_actor_user_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with auth_accounts as (
    select
      au.id as user_id,
      au.email::text as auth_email,
      au.last_sign_in_at,
      coalesce(up.status, 'active')::text as status,
      coalesce(up.player_mode, 'advanced')::text as player_mode,
      coalesce(up.created_at, au.created_at) as created_at,
      coalesce(up.updated_at, au.updated_at, au.created_at) as updated_at,
      app.is_admin(au.id) as is_admin
    from auth.users au
    left join app.user_profiles up
      on up.user_id = au.id
    where au.deleted_at is null
  ),
  current_names as (
    select ur.user_id, ur.username
    from app.username_registry ur
    where ur.is_current = true
  ),
  rename_stats as (
    select
      h.user_id,
      count(*) filter (where h.old_username is not null)::bigint as rename_count,
      count(*) filter (where h.old_username is not null and h.source = 'self_service')::bigint as self_service_change_count,
      count(*) filter (where h.old_username is not null and h.source <> 'self_service')::bigint as admin_change_count
    from app.username_change_history h
    group by h.user_id
  ),
  learning_stats as (
    select
      pp.user_id,
      sum(pp.total_sessions)::bigint as total_sessions,
      sum(pp.total_answered)::bigint as total_answered,
      sum(pp.total_correct)::bigint as total_correct,
      sum(pp.total_incorrect)::bigint as total_incorrect,
      case
        when sum(pp.total_answered) = 0 then 0
        else round((sum(pp.total_correct)::numeric / sum(pp.total_answered)::numeric) * 100)::integer
      end as accuracy,
      max(pp.last_studied_at) as last_studied_at
    from app.practice_profiles pp
    group by pp.user_id
  )
  select
    aa.user_id,
    cn.username::text as current_username,
    aa.auth_email::text,
    aa.is_admin,
    aa.status::text,
    aa.player_mode::text,
    aa.created_at,
    aa.updated_at,
    aa.last_sign_in_at,
    coalesce(prev.previous_usernames, '{}'::text[]) as previous_usernames,
    coalesce(rs.rename_count, 0)::bigint as rename_count,
    coalesce(rs.self_service_change_count, 0)::bigint as self_service_change_count,
    coalesce(rs.admin_change_count, 0)::bigint as admin_change_count,
    coalesce(ls.total_sessions, 0)::bigint as total_sessions,
    coalesce(ls.total_answered, 0)::bigint as total_answered,
    coalesce(ls.total_correct, 0)::bigint as total_correct,
    coalesce(ls.total_incorrect, 0)::bigint as total_incorrect,
    coalesce(ls.accuracy, 0)::integer as accuracy,
    ls.last_studied_at
  from auth_accounts aa
  left join current_names cn
    on cn.user_id = aa.user_id
  left join rename_stats rs
    on rs.user_id = aa.user_id
  left join learning_stats ls
    on ls.user_id = aa.user_id
  left join lateral (
    select array_agg(r.username order by r.assigned_at desc) as previous_usernames
    from app.username_registry r
    where r.user_id = aa.user_id
      and r.is_current = false
  ) prev
    on true
  where v_search is null
    or coalesce(cn.username, '') like ('%' || v_search || '%')
    or coalesce(lower(aa.auth_email), '') like ('%' || v_search || '%')
    or aa.user_id::text like ('%' || v_search || '%')
    or exists (
      select 1
      from app.username_registry sr
      where sr.user_id = aa.user_id
        and sr.username like ('%' || v_search || '%')
    )
  order by
    coalesce(ls.last_studied_at, aa.last_sign_in_at, aa.updated_at, aa.created_at) desc,
    coalesce(cn.username, aa.auth_email, aa.user_id::text) asc
  limit v_limit;
end;
$$;

create or replace function app.admin_set_user_player_mode(
  p_user_id uuid,
  p_player_mode text
)
returns table (
  out_user_id uuid,
  out_current_username text,
  out_player_mode text,
  out_updated_at timestamptz
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_player_mode text := lower(trim(coalesce(p_player_mode, '')));
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
    raise exception 'cannot_set_own_player_mode_from_admin' using errcode = '22023';
  end if;

  if v_player_mode not in ('advanced', 'generic') then
    raise exception 'invalid_player_mode' using errcode = '22023';
  end if;

  if app.is_admin(p_user_id) then
    raise exception 'cannot_edit_admin_account' using errcode = '22023';
  end if;

  perform 1
  from app.user_profiles up
  where up.user_id = p_user_id
  for update;

  if not found then
    raise exception 'target_user_not_found' using errcode = 'P0001';
  end if;

  select ur.username
    into out_current_username
  from app.username_registry ur
  where ur.user_id = p_user_id
    and ur.is_current = true;

  update app.user_profiles up
  set player_mode = v_player_mode,
      updated_by = v_actor_user_id
  where up.user_id = p_user_id
  returning up.user_id, up.player_mode, up.updated_at
  into out_user_id, out_player_mode, out_updated_at;

  return next;
end;
$$;

grant execute on function app.get_my_account_identity() to authenticated;
grant execute on function app.admin_list_users(text, integer) to authenticated;
grant execute on function app.admin_set_user_player_mode(uuid, text) to authenticated;

commit;
