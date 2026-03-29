begin;

create table if not exists app.question_explanation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.user_profiles(user_id) on delete cascade,
  question_id text not null,
  session_id uuid null references app.practice_sessions(session_id) on delete set null,
  curriculum text not null default 'general',
  opened_at timestamptz not null default timezone('utc', now()),
  surface text not null,
  explanation_kind text not null default 'base',
  created_at timestamptz not null default timezone('utc', now()),
  constraint question_explanation_events_surface_chk
    check (surface in ('quiz', 'review', 'study', 'admin')),
  constraint question_explanation_events_kind_chk
    check (explanation_kind in ('base', 'editorial', 'both'))
);

create index if not exists idx_question_explanation_events_user_opened
  on app.question_explanation_events (user_id, curriculum, opened_at desc);

create index if not exists idx_question_explanation_events_question
  on app.question_explanation_events (user_id, curriculum, question_id, opened_at desc);

create or replace function app.record_question_explanation_opened(
  p_question_id text,
  p_curriculum text default 'general',
  p_session_id uuid default null,
  p_surface text default 'review',
  p_explanation_kind text default 'base'
)
returns void
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_question_id text := nullif(trim(p_question_id), '');
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_surface text := coalesce(nullif(trim(lower(p_surface)), ''), 'review');
  v_explanation_kind text := coalesce(nullif(trim(lower(p_explanation_kind)), ''), 'base');
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if v_question_id is null then
    return;
  end if;

  if v_surface not in ('quiz', 'review', 'study', 'admin') then
    raise exception 'invalid_surface' using errcode = '22023';
  end if;

  if v_explanation_kind not in ('base', 'editorial', 'both') then
    raise exception 'invalid_explanation_kind' using errcode = '22023';
  end if;

  insert into app.question_explanation_events (
    user_id,
    question_id,
    session_id,
    curriculum,
    opened_at,
    surface,
    explanation_kind
  )
  values (
    v_user_id,
    v_question_id,
    p_session_id,
    v_curriculum,
    timezone('utc', now()),
    v_surface,
    v_explanation_kind
  );

  update app.user_question_state uqs
  set times_explanation_opened = coalesce(uqs.times_explanation_opened, 0) + 1
  where uqs.user_id = v_user_id
    and uqs.curriculum = v_curriculum
    and uqs.question_id = v_question_id;
end;
$$;

grant execute on function app.record_question_explanation_opened(text, text, uuid, text, text) to authenticated;

commit;
