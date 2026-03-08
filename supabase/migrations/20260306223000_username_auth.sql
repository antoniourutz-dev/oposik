begin;

create schema if not exists app;
create extension if not exists pgcrypto;

create or replace function app.normalize_username(p_username text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_username, '')));
$$;

create or replace function app.is_valid_username(p_username text)
returns boolean
language sql
immutable
as $$
  select app.normalize_username(p_username) ~ '^[a-z0-9](?:[a-z0-9_]{1,30}[a-z0-9])?$';
$$;

create table if not exists app.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table if not exists app.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_at timestamptz not null default timezone('utc', now()),
  granted_by uuid references auth.users(id),
  primary key (user_id, role)
);

create table if not exists app.username_registry (
  username text primary key,
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  is_current boolean not null default true,
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid not null references auth.users(id),
  retired_at timestamptz,
  retired_by uuid references auth.users(id),
  source text not null default 'provisioning',
  metadata jsonb not null default '{}'::jsonb,
  constraint username_registry_username_normalized_chk
    check (username = app.normalize_username(username)),
  constraint username_registry_username_valid_chk
    check (app.is_valid_username(username)),
  constraint username_registry_state_chk
    check (
      (is_current and retired_at is null and retired_by is null)
      or
      ((not is_current) and retired_at is not null and retired_by is not null)
    )
);

create unique index if not exists uq_username_registry_one_current_per_user
  on app.username_registry (user_id)
  where is_current;

create index if not exists idx_username_registry_user_assigned_at
  on app.username_registry (user_id, assigned_at desc);

create table if not exists app.username_change_history (
  change_id bigint generated always as identity primary key,
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  old_username text,
  new_username text not null,
  changed_at timestamptz not null default timezone('utc', now()),
  changed_by uuid not null references auth.users(id),
  source text not null default 'self_service',
  reason text,
  request_id uuid not null default gen_random_uuid(),
  metadata jsonb not null default '{}'::jsonb,
  constraint username_change_history_old_valid_chk
    check (old_username is null or app.is_valid_username(old_username)),
  constraint username_change_history_new_valid_chk
    check (app.is_valid_username(new_username)),
  constraint username_change_history_request_uk
    unique (user_id, request_id)
);

create index if not exists idx_username_change_history_user_time
  on app.username_change_history (user_id, changed_at desc);

create index if not exists idx_username_change_history_old_username
  on app.username_change_history (old_username);

create index if not exists idx_username_change_history_new_username
  on app.username_change_history (new_username);

create or replace function app.touch_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_user_profiles_updated_at on app.user_profiles;
create trigger trg_touch_user_profiles_updated_at
before update on app.user_profiles
for each row execute function app.touch_user_profiles_updated_at();

create or replace function app.ensure_user_profile_exists()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  insert into app.user_profiles (user_id, created_at, updated_at, created_by, updated_by)
  values (
    new.id,
    coalesce(new.created_at, timezone('utc', now())),
    coalesce(new.created_at, timezone('utc', now())),
    new.id,
    new.id
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_auth_user_profile on auth.users;
create trigger trg_auth_user_profile
after insert on auth.users
for each row execute function app.ensure_user_profile_exists();

create or replace function app.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select exists (
    select 1
    from app.user_roles r
    where r.user_id = coalesce(p_user_id, auth.uid())
      and r.role = 'admin'
  );
$$;

create or replace function app.sync_auth_user_metadata_username()
returns trigger
language plpgsql
security definer
set search_path = app, public, auth
as $$
begin
  if new.is_current then
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', new.username)
    where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_auth_user_metadata_username on app.username_registry;
create trigger trg_sync_auth_user_metadata_username
after insert on app.username_registry
for each row execute function app.sync_auth_user_metadata_username();

create or replace function app.resolve_login_principal(p_username text)
returns table (
  user_id uuid,
  internal_email text
)
language sql
security definer
set search_path = app, public, auth
as $$
  select ur.user_id, au.email
  from app.username_registry ur
  join app.user_profiles up on up.user_id = ur.user_id
  join auth.users au on au.id = ur.user_id
  where ur.username = app.normalize_username(p_username)
    and ur.is_current = true
    and up.status = 'active'
    and au.deleted_at is null;
$$;

create or replace function app.get_my_account_identity()
returns table (
  user_id uuid,
  current_username text,
  is_admin boolean,
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
  where current_row.user_id = auth.uid()
    and current_row.is_current = true;
$$;

create or replace function app.change_my_username(
  p_new_username text,
  p_reason text default null,
  p_request_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  user_id uuid,
  old_username text,
  new_username text,
  changed_at timestamptz
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

  if not app.is_valid_username(v_new_username) then
    raise exception 'invalid_username_format'
      using errcode = '22023',
            detail = 'Use 3-32 chars: a-z, 0-9 y _.';
  end if;

  select h.user_id, h.old_username, h.new_username, h.changed_at
    into user_id, old_username, new_username, changed_at
  from app.username_change_history h
  where h.user_id = v_actor_user_id
    and h.request_id = v_request_id;

  if found then
    return next;
    return;
  end if;

  insert into app.user_profiles (user_id, created_by, updated_by)
  values (v_actor_user_id, v_actor_user_id, v_actor_user_id)
  on conflict (user_id) do nothing;

  perform 1
  from app.user_profiles up
  where up.user_id = v_actor_user_id
  for update;

  select username
    into v_old_username
  from app.username_registry ur
  where ur.user_id = v_actor_user_id
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
  where ur.user_id = v_actor_user_id
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
    v_actor_user_id,
    true,
    v_now,
    v_actor_user_id,
    'self_service',
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
    v_actor_user_id,
    v_old_username,
    v_new_username,
    v_now,
    v_actor_user_id,
    'self_service',
    p_reason,
    v_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  update app.user_profiles up
  set updated_by = v_actor_user_id
  where up.user_id = v_actor_user_id;

  return query
  select v_actor_user_id, v_old_username, v_new_username, v_now;

exception
  when unique_violation then
    raise exception 'username_already_taken'
      using errcode = '23505',
            detail = 'El username ya esta asignado o reservado historicamente.';
end;
$$;

create or replace function app.admin_find_user_by_any_username(p_username text)
returns table (
  user_id uuid,
  matched_username text,
  matched_is_current boolean,
  current_username text,
  previous_usernames text[]
)
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if not app.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with hit as (
    select r.user_id, r.username, r.is_current
    from app.username_registry r
    where r.username = app.normalize_username(p_username)
  )
  select
    h.user_id,
    h.username as matched_username,
    h.is_current as matched_is_current,
    c.username as current_username,
    coalesce(
      (
        select array_agg(r2.username order by r2.assigned_at desc)
        from app.username_registry r2
        where r2.user_id = h.user_id
          and r2.is_current = false
      ),
      '{}'::text[]
    ) as previous_usernames
  from hit h
  join app.username_registry c
    on c.user_id = h.user_id
   and c.is_current = true;
end;
$$;

create or replace function app.admin_get_username_timeline(p_user_id uuid)
returns table (
  change_id bigint,
  old_username text,
  new_username text,
  changed_at timestamptz,
  changed_by uuid,
  source text,
  reason text,
  request_id uuid
)
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if not app.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    h.change_id,
    h.old_username,
    h.new_username,
    h.changed_at,
    h.changed_by,
    h.source,
    h.reason,
    h.request_id
  from app.username_change_history h
  where h.user_id = p_user_id
  order by h.changed_at desc;
end;
$$;

insert into app.user_profiles (user_id, created_at, updated_at, created_by, updated_by)
select
  u.id,
  coalesce(u.created_at, timezone('utc', now())),
  coalesce(u.created_at, timezone('utc', now())),
  u.id,
  u.id
from auth.users u
on conflict (user_id) do nothing;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute $sql$
      insert into app.username_registry (username, user_id, is_current, assigned_at, assigned_by, source)
      select
        app.normalize_username(p.username),
        p.id,
        true,
        coalesce(u.created_at, timezone('utc', now())),
        u.id,
        'migration_profiles'
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.username is not null
        and trim(p.username) <> ''
      on conflict (username) do nothing
    $sql$;
  end if;
end
$$;

insert into app.username_registry (username, user_id, is_current, assigned_at, assigned_by, source)
select
  app.normalize_username(split_part(u.email, '@', 1)),
  u.id,
  true,
  coalesce(u.created_at, timezone('utc', now())),
  u.id,
  'migration_auth_email'
from auth.users u
where u.email is not null
  and not exists (
    select 1
    from app.username_registry r
    where r.user_id = u.id
  )
on conflict (username) do nothing;

insert into app.user_roles (user_id, role, granted_by)
select r.user_id, 'admin', r.user_id
from app.username_registry r
where r.is_current = true
  and r.username in ('admin', 'k_admin')
on conflict (user_id, role) do nothing;

revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

revoke all on app.user_profiles from anon, authenticated;
revoke all on app.user_roles from anon, authenticated;
revoke all on app.username_registry from anon, authenticated;
revoke all on app.username_change_history from anon, authenticated;

grant select on app.user_profiles to authenticated;
grant select on app.user_roles to authenticated;
grant select on app.username_registry to authenticated;
grant select on app.username_change_history to authenticated;

alter table app.user_profiles enable row level security;
alter table app.user_roles enable row level security;
alter table app.username_registry enable row level security;
alter table app.username_change_history enable row level security;

drop policy if exists user_profiles_select_self_or_admin on app.user_profiles;
create policy user_profiles_select_self_or_admin
on app.user_profiles
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

drop policy if exists user_roles_select_admin_only on app.user_roles;
create policy user_roles_select_admin_only
on app.user_roles
for select
to authenticated
using (app.is_admin());

drop policy if exists username_registry_select_self_or_admin on app.username_registry;
create policy username_registry_select_self_or_admin
on app.username_registry
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

drop policy if exists username_change_history_select_self_or_admin on app.username_change_history;
create policy username_change_history_select_self_or_admin
on app.username_change_history
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

revoke all on function app.resolve_login_principal(text) from public;
grant execute on function app.resolve_login_principal(text) to service_role;

grant execute on function app.is_admin(uuid) to authenticated;
grant execute on function app.get_my_account_identity() to authenticated;
grant execute on function app.change_my_username(text, text, uuid, jsonb) to authenticated;
grant execute on function app.admin_find_user_by_any_username(text) to authenticated;
grant execute on function app.admin_get_username_timeline(uuid) to authenticated;

commit;
