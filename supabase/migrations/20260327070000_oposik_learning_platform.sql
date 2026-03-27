begin;

create table if not exists app.practice_profiles (
  user_id uuid primary key references app.user_profiles(user_id) on delete cascade,
  curriculum text not null default 'general',
  next_standard_batch_start_index integer not null default 0 check (next_standard_batch_start_index >= 0),
  total_answered integer not null default 0 check (total_answered >= 0),
  total_correct integer not null default 0 check (total_correct >= 0),
  total_incorrect integer not null default 0 check (total_incorrect >= 0),
  total_sessions integer not null default 0 check (total_sessions >= 0),
  last_studied_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists app.practice_sessions (
  session_id uuid primary key,
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  curriculum text not null default 'general',
  mode text not null check (mode in ('standard', 'weakest')),
  title text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  score integer not null check (score >= 0),
  total integer not null check (total >= 0),
  batch_number integer,
  batch_size integer,
  batch_start_index integer,
  next_standard_batch_start_index integer,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists app.practice_attempts (
  attempt_id bigint generated always as identity primary key,
  session_id uuid not null references app.practice_sessions(session_id) on delete cascade,
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  curriculum text not null default 'general',
  question_id text not null,
  question_number integer,
  question_statement text not null,
  category text,
  explanation text,
  selected_option text,
  correct_option text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default timezone('utc', now()),
  constraint practice_attempts_selected_option_chk
    check (selected_option is null or selected_option in ('a', 'b', 'c', 'd')),
  constraint practice_attempts_correct_option_chk
    check (correct_option in ('a', 'b', 'c', 'd')),
  constraint practice_attempts_session_question_uk
    unique (session_id, question_id)
);

create table if not exists app.practice_question_stats (
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  curriculum text not null default 'general',
  question_id text not null,
  question_number integer,
  statement text not null,
  category text,
  explanation text,
  attempts integer not null default 0 check (attempts >= 0),
  correct_attempts integer not null default 0 check (correct_attempts >= 0),
  incorrect_attempts integer not null default 0 check (incorrect_attempts >= 0),
  last_answered_at timestamptz not null default timezone('utc', now()),
  last_incorrect_at timestamptz,
  primary key (user_id, curriculum, question_id)
);

create index if not exists idx_practice_sessions_user_finished_at
  on app.practice_sessions (user_id, finished_at desc);

create index if not exists idx_practice_attempts_user_answered_at
  on app.practice_attempts (user_id, answered_at desc);

create index if not exists idx_practice_question_stats_user_incorrect
  on app.practice_question_stats (user_id, curriculum, incorrect_attempts desc, last_incorrect_at desc nulls last);

create or replace function app.touch_practice_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_practice_profiles_updated_at on app.practice_profiles;
create trigger trg_touch_practice_profiles_updated_at
before update on app.practice_profiles
for each row execute function app.touch_practice_profiles_updated_at();

create or replace function app.ensure_practice_profile(p_user_id uuid)
returns app.practice_profiles
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_profile app.practice_profiles;
begin
  insert into app.practice_profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
    into v_profile
  from app.practice_profiles
  where user_id = p_user_id;

  return v_profile;
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

  if p_mode not in ('standard', 'weakest') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;

  perform app.ensure_practice_profile(v_user_id);

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
    where pp.user_id = v_user_id;
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
      session_id,
      user_id,
      curriculum,
      question_id,
      question_number,
      statement,
      category,
      explanation,
      selected_option,
      correct_option,
      is_correct,
      p_finished_at
    from normalized_attempts
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
    curriculum = v_curriculum,
    next_standard_batch_start_index = greatest(coalesce(p_next_standard_batch_start_index, 0), 0),
    total_answered = pp.total_answered + greatest(coalesce(p_total, 0), 0),
    total_correct = pp.total_correct + greatest(coalesce(p_score, 0), 0),
    total_incorrect = pp.total_incorrect + greatest(coalesce(p_total, 0), 0) - greatest(coalesce(p_score, 0), 0),
    total_sessions = pp.total_sessions + 1,
    last_studied_at = greatest(coalesce(pp.last_studied_at, p_finished_at), p_finished_at)
  where pp.user_id = v_user_id;

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
  where pp.user_id = v_user_id;
end;
$$;

create or replace function app.get_my_practice_profile()
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
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform app.ensure_practice_profile(v_user_id);

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
  where pp.user_id = v_user_id;
end;
$$;

create or replace function app.admin_get_practice_profile(p_user_id uuid)
returns table (
  user_id uuid,
  curriculum text,
  next_standard_batch_start_index integer,
  total_answered integer,
  total_correct integer,
  total_incorrect integer,
  total_sessions integer,
  accuracy integer,
  last_studied_at timestamptz
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
begin
  if not app.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform app.ensure_practice_profile(p_user_id);

  return query
  select
    pp.user_id,
    pp.curriculum,
    pp.next_standard_batch_start_index,
    pp.total_answered,
    pp.total_correct,
    pp.total_incorrect,
    pp.total_sessions,
    case
      when pp.total_answered = 0 then 0
      else round((pp.total_correct::numeric / pp.total_answered::numeric) * 100)::integer
    end as accuracy,
    pp.last_studied_at
  from app.practice_profiles pp
  where pp.user_id = p_user_id;
end;
$$;

create or replace function app.admin_get_recent_practice_sessions(
  p_user_id uuid,
  p_limit integer default 12
)
returns table (
  session_id uuid,
  curriculum text,
  mode text,
  title text,
  started_at timestamptz,
  finished_at timestamptz,
  score integer,
  total integer,
  batch_number integer,
  batch_size integer
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
begin
  if not app.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    ps.session_id,
    ps.curriculum,
    ps.mode,
    ps.title,
    ps.started_at,
    ps.finished_at,
    ps.score,
    ps.total,
    ps.batch_number,
    ps.batch_size
  from app.practice_sessions ps
  where ps.user_id = p_user_id
  order by ps.finished_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 100));
end;
$$;

create or replace function app.admin_get_weak_practice_questions(
  p_user_id uuid,
  p_limit integer default 5
)
returns table (
  question_id text,
  question_number integer,
  statement text,
  category text,
  explanation text,
  attempts integer,
  correct_attempts integer,
  incorrect_attempts integer,
  last_answered_at timestamptz,
  last_incorrect_at timestamptz
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
begin
  if not app.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    qs.question_id,
    qs.question_number,
    qs.statement,
    qs.category,
    qs.explanation,
    qs.attempts,
    qs.correct_attempts,
    qs.incorrect_attempts,
    qs.last_answered_at,
    qs.last_incorrect_at
  from app.practice_question_stats qs
  where qs.user_id = p_user_id
  order by qs.incorrect_attempts desc, qs.last_incorrect_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 5), 50));
end;
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
      pp.total_sessions::bigint as total_sessions,
      pp.total_answered::bigint as total_answered,
      pp.total_correct::bigint as total_correct,
      pp.total_incorrect::bigint as total_incorrect,
      case
        when pp.total_answered = 0 then 0
        else round((pp.total_correct::numeric / pp.total_answered::numeric) * 100)::integer
      end as accuracy,
      pp.last_studied_at
    from app.practice_profiles pp
  )
  select
    aa.user_id,
    cn.username::text as current_username,
    aa.auth_email::text,
    aa.is_admin,
    aa.status::text,
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

grant select on app.practice_profiles to authenticated;
grant select on app.practice_sessions to authenticated;
grant select on app.practice_attempts to authenticated;
grant select on app.practice_question_stats to authenticated;

alter table app.practice_profiles enable row level security;
alter table app.practice_sessions enable row level security;
alter table app.practice_attempts enable row level security;
alter table app.practice_question_stats enable row level security;

drop policy if exists practice_profiles_select_self_or_admin on app.practice_profiles;
create policy practice_profiles_select_self_or_admin
on app.practice_profiles
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

drop policy if exists practice_sessions_select_self_or_admin on app.practice_sessions;
create policy practice_sessions_select_self_or_admin
on app.practice_sessions
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

drop policy if exists practice_attempts_select_self_or_admin on app.practice_attempts;
create policy practice_attempts_select_self_or_admin
on app.practice_attempts
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

drop policy if exists practice_question_stats_select_self_or_admin on app.practice_question_stats;
create policy practice_question_stats_select_self_or_admin
on app.practice_question_stats
for select
to authenticated
using (user_id = auth.uid() or app.is_admin());

grant execute on function app.ensure_practice_profile(uuid) to authenticated;
grant execute on function app.record_practice_session(uuid, text, text, text, timestamptz, timestamptz, integer, integer, integer, integer, integer, integer, jsonb) to authenticated;
grant execute on function app.get_my_practice_profile() to authenticated;
grant execute on function app.admin_get_practice_profile(uuid) to authenticated;
grant execute on function app.admin_get_recent_practice_sessions(uuid, integer) to authenticated;
grant execute on function app.admin_get_weak_practice_questions(uuid, integer) to authenticated;
grant execute on function app.admin_list_users(text, integer) to authenticated;

commit;
