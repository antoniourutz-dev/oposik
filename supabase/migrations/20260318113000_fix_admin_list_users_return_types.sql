begin;

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
  created_at timestamptz,
  updated_at timestamptz,
  previous_usernames text[],
  rename_count bigint,
  self_service_change_count bigint,
  admin_change_count bigint,
  played_days bigint,
  total_points bigint,
  last_played_at timestamptz
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
      coalesce(up.status, 'active')::text as status,
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
      count(*) filter (
        where h.old_username is not null
          and h.source = 'self_service'
      )::bigint as self_service_change_count,
      count(*) filter (
        where h.old_username is not null
          and h.source <> 'self_service'
      )::bigint as admin_change_count
    from app.username_change_history h
    group by h.user_id
  ),
  game_stats as (
    select
      gr.user_id,
      count(distinct gr.day_index) filter (
        where gr.play_mode = 'DAILY'
          and gr.day_index is not null
      )::bigint as played_days,
      coalesce(sum(gr.correct_answers), 0)::bigint as total_points,
      max(gr.played_at) as last_played_at
    from public.game_results gr
    group by gr.user_id
  )
  select
    aa.user_id,
    cn.username::text as current_username,
    aa.auth_email::text,
    aa.is_admin,
    aa.status::text,
    aa.created_at,
    aa.updated_at,
    coalesce(prev.previous_usernames, '{}'::text[]) as previous_usernames,
    coalesce(rs.rename_count, 0)::bigint as rename_count,
    coalesce(rs.self_service_change_count, 0)::bigint as self_service_change_count,
    coalesce(rs.admin_change_count, 0)::bigint as admin_change_count,
    coalesce(gs.played_days, 0)::bigint as played_days,
    coalesce(gs.total_points, 0)::bigint as total_points,
    gs.last_played_at
  from auth_accounts aa
  left join current_names cn
    on cn.user_id = aa.user_id
  left join rename_stats rs
    on rs.user_id = aa.user_id
  left join game_stats gs
    on gs.user_id = aa.user_id
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
    coalesce(gs.last_played_at, aa.updated_at, aa.created_at) desc,
    coalesce(cn.username, aa.auth_email, aa.user_id::text) asc
  limit v_limit;
end;
$$;

grant execute on function app.admin_list_users(text, integer) to authenticated;

commit;
