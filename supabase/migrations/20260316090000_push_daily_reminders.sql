begin;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
  else
    raise notice 'pg_cron extension not available; skipping';
  end if;

  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_net';
  else
    raise notice 'pg_net extension not available; skipping';
  end if;

  if exists (select 1 from pg_available_extensions where name = 'vault') then
    execute 'create extension if not exists vault';
  else
    raise notice 'vault extension not available; skipping';
  end if;
end;
$$;

create table if not exists app.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  timezone text not null default 'Europe/Madrid',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_reason text
);

create index if not exists idx_push_subscriptions_user_active
  on app.push_subscriptions (user_id, is_active);

create table if not exists app.push_notification_delivery_log (
  delivery_id bigint generated always as identity primary key,
  subscription_id bigint not null references app.push_subscriptions(id) on delete cascade,
  reminder_day_key text not null,
  day_index integer not null check (day_index between 0 and 10),
  sent_at timestamptz not null default timezone('utc', now()),
  response_code integer,
  unique (subscription_id, reminder_day_key)
);

create index if not exists idx_push_delivery_log_day_key
  on app.push_notification_delivery_log (reminder_day_key);

create or replace function app.touch_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_push_subscriptions_updated_at on app.push_subscriptions;
create trigger trg_touch_push_subscriptions_updated_at
before update on app.push_subscriptions
for each row execute function app.touch_push_subscriptions_updated_at();

create or replace function app.challenge_day_unlock_at(
  p_start_date date,
  p_day_index integer,
  p_timezone text default 'Europe/Madrid'
)
returns timestamptz
language sql
immutable
as $$
  with target_day as (
    select (p_start_date + greatest(p_day_index, 0))::date as d
  )
  select make_timestamptz(
    extract(year from d)::integer,
    extract(month from d)::integer,
    extract(day from d)::integer,
    case when p_day_index = 0 then 15 else 0 end,
    case when p_day_index = 0 then 30 else 1 end,
    0,
    p_timezone
  )
  from target_day;
$$;

create or replace function app.challenge_day_index_at(
  p_start_date date,
  p_reference_time timestamptz,
  p_days_count integer default 11,
  p_timezone text default 'Europe/Madrid'
)
returns integer
language plpgsql
immutable
as $$
declare
  v_day_index integer;
begin
  if p_start_date is null or p_reference_time is null then
    return -1;
  end if;

  for v_day_index in reverse greatest(p_days_count - 1, 0)..0 loop
    if p_reference_time >= app.challenge_day_unlock_at(p_start_date, v_day_index, p_timezone) then
      return v_day_index;
    end if;
  end loop;

  return -1;
end;
$$;

create or replace function app.upsert_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null,
  p_timezone text default 'Europe/Madrid'
)
returns table (
  subscription_id bigint,
  user_id uuid,
  endpoint text,
  is_active boolean
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_endpoint, '')), '') is null
    or nullif(trim(coalesce(p_p256dh, '')), '') is null
    or nullif(trim(coalesce(p_auth, '')), '') is null then
    raise exception 'invalid_push_subscription' using errcode = '22023';
  end if;

  insert into app.user_profiles (user_id, created_by, updated_by)
  values (v_actor_user_id, v_actor_user_id, v_actor_user_id)
  on conflict on constraint user_profiles_pkey do nothing;

  insert into app.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    timezone,
    is_active,
    last_failure_at,
    failure_reason
  )
  values (
    v_actor_user_id,
    trim(p_endpoint),
    trim(p_p256dh),
    trim(p_auth),
    nullif(trim(coalesce(p_user_agent, '')), ''),
    coalesce(nullif(trim(coalesce(p_timezone, '')), ''), 'Europe/Madrid'),
    true,
    null,
    null
  )
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        timezone = excluded.timezone,
        is_active = true,
        last_failure_at = null,
        failure_reason = null
  returning
    app.push_subscriptions.id,
    app.push_subscriptions.user_id,
    app.push_subscriptions.endpoint,
    app.push_subscriptions.is_active
  into subscription_id, user_id, endpoint, is_active;

  return next;
end;
$$;

create or replace function app.delete_my_push_subscription(
  p_endpoint text
)
returns integer
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_deleted_count integer := 0;
begin
  if v_actor_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  delete from app.push_subscriptions
  where user_id = v_actor_user_id
    and endpoint = trim(coalesce(p_endpoint, ''));

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

create or replace function app.list_due_daily_push_reminders(
  p_reference_time timestamptz default timezone('utc', now()),
  p_days_count integer default 11,
  p_timezone text default 'Europe/Madrid'
)
returns table (
  subscription_id bigint,
  user_id uuid,
  current_username text,
  endpoint text,
  p256dh text,
  auth_secret text,
  reminder_day_key text,
  day_index integer
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_start_date date;
  v_first_unlock_at timestamptz;
  v_after_window_unlock_at timestamptz;
  v_current_day_index integer;
  v_local_time time;
  v_reminder_day_key text;
begin
  select nullif(trim(config_value), '')::date
    into v_start_date
  from public.korrika_app_config
  where config_key = 'challenge_start_date'
  limit 1;

  if v_start_date is null then
    return;
  end if;

  v_first_unlock_at := app.challenge_day_unlock_at(v_start_date, 0, p_timezone);
  v_after_window_unlock_at := app.challenge_day_unlock_at(v_start_date, p_days_count, p_timezone);

  if p_reference_time < v_first_unlock_at or p_reference_time >= v_after_window_unlock_at then
    return;
  end if;

  v_local_time := (p_reference_time at time zone p_timezone)::time;
  if v_local_time < time '10:00:00' or v_local_time >= time '11:00:00' then
    return;
  end if;

  v_current_day_index := app.challenge_day_index_at(v_start_date, p_reference_time, p_days_count, p_timezone);
  if v_current_day_index < 0 then
    return;
  end if;

  v_reminder_day_key := to_char(p_reference_time at time zone p_timezone, 'YYYY-MM-DD');

  return query
  with played_today as (
    select distinct gr.user_id
    from public.game_results gr
    where gr.play_mode = 'DAILY'
      and gr.day_index = v_current_day_index
      and gr.played_at >= v_first_unlock_at
  )
  select
    ps.id,
    ps.user_id,
    coalesce(ur.username, 'jokalaria') as current_username,
    ps.endpoint,
    ps.p256dh,
    ps.auth as auth_secret,
    v_reminder_day_key,
    v_current_day_index
  from app.push_subscriptions ps
  left join app.username_registry ur
    on ur.user_id = ps.user_id
   and ur.is_current = true
  left join played_today pt
    on pt.user_id = ps.user_id
  where ps.is_active = true
    and pt.user_id is null
    and not exists (
      select 1
      from app.push_notification_delivery_log dl
      where dl.subscription_id = ps.id
        and dl.reminder_day_key = v_reminder_day_key
    );
end;
$$;

revoke all on app.push_subscriptions from anon, authenticated;
revoke all on app.push_notification_delivery_log from anon, authenticated;

grant select, insert, update on app.push_subscriptions to service_role;
grant select, insert on app.push_notification_delivery_log to service_role;
grant usage, select on all sequences in schema app to service_role;

alter table app.push_subscriptions enable row level security;
alter table app.push_notification_delivery_log enable row level security;

drop policy if exists push_subscriptions_service_role_only on app.push_subscriptions;
create policy push_subscriptions_service_role_only
on app.push_subscriptions
for all
to service_role
using (true)
with check (true);

drop policy if exists push_notification_delivery_log_service_role_only on app.push_notification_delivery_log;
create policy push_notification_delivery_log_service_role_only
on app.push_notification_delivery_log
for all
to service_role
using (true)
with check (true);

grant execute on function app.upsert_push_subscription(text, text, text, text, text) to authenticated;
grant execute on function app.delete_my_push_subscription(text) to authenticated;
grant execute on function app.list_due_daily_push_reminders(timestamptz, integer, text) to service_role;
grant execute on function app.challenge_day_unlock_at(date, integer, text) to authenticated, service_role;
grant execute on function app.challenge_day_index_at(date, timestamptz, integer, text) to authenticated, service_role;

create or replace function public.invoke_daily_push_reminders_job()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
  v_cron_secret text;
begin
  if to_regnamespace('vault') is null or to_regclass('vault.decrypted_secrets') is null then
    raise log 'daily push reminder job skipped: vault not available';
    return;
  end if;

  if to_regnamespace('net') is null then
    raise log 'daily push reminder job skipped: pg_net not available';
    return;
  end if;

  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into v_project_url
    using 'project_url';

  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into v_cron_secret
    using 'daily_push_reminder_cron_secret';

  if coalesce(v_project_url, '') = '' or coalesce(v_cron_secret, '') = '' then
    raise log 'daily push reminder job skipped: missing vault secrets';
    return;
  end if;

  perform net.http_post(
    url := v_project_url || '/functions/v1/daily-push-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cron_secret
    ),
    body := jsonb_build_object('source', 'pg_cron', 'triggered_at', timezone('utc', now()))
  );
end;
$$;

do $$
declare
  v_existing_job_id bigint;
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron extension not available; skipping reminder schedule';
    return;
  end if;

  select jobid
    into v_existing_job_id
  from cron.job
  where jobname = 'daily-korrika-push-reminders'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(
    'daily-korrika-push-reminders',
    '*/15 * * * *',
    $job$select public.invoke_daily_push_reminders_job();$job$
  );
end;
$$;

commit;
