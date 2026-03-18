begin;

create or replace function app.list_registered_players()
returns table (
  username text
)
language sql
security definer
set search_path = app, public, auth
as $$
  select ur.username::text
  from app.username_registry ur
  join app.user_profiles up
    on up.user_id = ur.user_id
  join auth.users au
    on au.id = ur.user_id
  where ur.is_current = true
    and up.status = 'active'
    and au.deleted_at is null
  order by ur.username asc;
$$;

grant execute on function app.list_registered_players() to authenticated;

commit;
