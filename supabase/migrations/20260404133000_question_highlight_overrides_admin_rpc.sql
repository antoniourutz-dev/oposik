begin;

create or replace function app.admin_set_question_highlight_override(
  p_question_id bigint,
  p_content_type text,
  p_answer_index smallint default null,
  p_mode text default 'manual',
  p_spans jsonb default '[]'::jsonb
)
returns public.question_highlight_overrides
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_content_type text := lower(trim(coalesce(p_content_type, '')));
  v_mode text := lower(trim(coalesce(p_mode, '')));
  v_answer_index smallint := p_answer_index;
  v_next_version integer;
  v_result public.question_highlight_overrides;
begin
  if v_actor_user_id is null or not app.is_admin(v_actor_user_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_question_id is null or p_question_id <= 0 then
    raise exception 'invalid question_id' using errcode = '22023';
  end if;

  if v_content_type not in ('question', 'answer', 'explanation') then
    raise exception 'invalid content_type' using errcode = '22023';
  end if;

  if v_mode not in ('manual', 'disabled') then
    raise exception 'invalid mode' using errcode = '22023';
  end if;

  if v_content_type = 'answer' and v_answer_index is null then
    raise exception 'answer_index required for answer content_type' using errcode = '22023';
  end if;

  if v_content_type <> 'answer' then
    v_answer_index := null;
  end if;

  update public.question_highlight_overrides
  set
    is_active = false,
    updated_by = v_actor_user_id,
    updated_at = timezone('utc', now())
  where question_id = p_question_id
    and content_type = v_content_type
    and (
      (v_answer_index is null and answer_index is null)
      or answer_index = v_answer_index
    )
    and is_active = true;

  select coalesce(max(version), 0) + 1
    into v_next_version
  from public.question_highlight_overrides
  where question_id = p_question_id
    and content_type = v_content_type
    and (
      (v_answer_index is null and answer_index is null)
      or answer_index = v_answer_index
    );

  insert into public.question_highlight_overrides (
    question_id,
    content_type,
    answer_index,
    mode,
    spans,
    version,
    is_active,
    created_by,
    updated_by
  )
  values (
    p_question_id,
    v_content_type,
    v_answer_index,
    v_mode,
    case
      when v_mode = 'manual' then coalesce(p_spans, '[]'::jsonb)
      else '[]'::jsonb
    end,
    v_next_version,
    true,
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
    into v_result;

  return v_result;
end;
$$;

create or replace function app.admin_restore_question_highlight_automatic(
  p_question_id bigint,
  p_content_type text,
  p_answer_index smallint default null
)
returns void
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_content_type text := lower(trim(coalesce(p_content_type, '')));
  v_answer_index smallint := p_answer_index;
begin
  if v_actor_user_id is null or not app.is_admin(v_actor_user_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_question_id is null or p_question_id <= 0 then
    raise exception 'invalid question_id' using errcode = '22023';
  end if;

  if v_content_type not in ('question', 'answer', 'explanation') then
    raise exception 'invalid content_type' using errcode = '22023';
  end if;

  if v_content_type = 'answer' and v_answer_index is null then
    raise exception 'answer_index required for answer content_type' using errcode = '22023';
  end if;

  if v_content_type <> 'answer' then
    v_answer_index := null;
  end if;

  update public.question_highlight_overrides
  set
    is_active = false,
    updated_by = v_actor_user_id,
    updated_at = timezone('utc', now())
  where question_id = p_question_id
    and content_type = v_content_type
    and (
      (v_answer_index is null and answer_index is null)
      or answer_index = v_answer_index
    )
    and is_active = true;
end;
$$;

grant execute on function app.admin_set_question_highlight_override(bigint, text, smallint, text, jsonb) to authenticated;
grant execute on function app.admin_restore_question_highlight_automatic(bigint, text, smallint) to authenticated;

commit;
