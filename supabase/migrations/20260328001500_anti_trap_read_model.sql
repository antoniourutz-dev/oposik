begin;

create or replace function app.is_anti_trap_question(
  p_payload jsonb
)
returns boolean
language sql
immutable
as $$
  with normalized as (
    select lower(
      trim(
        concat_ws(
          ' ',
          coalesce(p_payload->>'pregunta', ''),
          coalesce(p_payload->>'question_text', ''),
          coalesce(p_payload->>'enunciado', ''),
          coalesce(p_payload->>'texto', ''),
          coalesce(p_payload->>'question', ''),
          coalesce(p_payload->>'opcion_a', ''),
          coalesce(p_payload->>'opcion_b', ''),
          coalesce(p_payload->>'opcion_c', ''),
          coalesce(p_payload->>'opcion_d', ''),
          coalesce(p_payload->>'option_a', ''),
          coalesce(p_payload->>'option_b', ''),
          coalesce(p_payload->>'option_c', ''),
          coalesce(p_payload->>'option_d', '')
        )
      )
    ) as content
  )
  select
    content ~ '\m(excepto|salvo|menos)\M'
    or content ~ '\m(no|nunca|falso|incorrecta|incorrecto|erronea|erroneo)\M'
    or content ~ '\m(dia|dias|mes|meses|ano|anos|hora|horas|minuto|minutos|semana|semanas|habil|habiles|natural|naturales)\M'
    or content ~ '\m(consejo|director|ministro|departamento|autoridad|comision|tribunal|organo|gerencia)\M'
    or content ~ '\m(ley|decreto|real decreto|orden|articulo)\M'
    or content ~ '\d+/\d+'
    or content ~ '\d'
  from normalized;
$$;

create or replace function app.get_anti_trap_batch(
  p_curriculum text default 'general',
  p_limit integer default 20
)
returns table (
  payload jsonb,
  source_bucket text
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_curriculum text := coalesce(nullif(trim(p_curriculum), ''), 'general');
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  with risky_states as (
    select
      qs.question_id,
      'state'::text as source_bucket,
      row_number() over (
        order by
          qs.exam_retention_probability asc,
          qs.p_correct_estimated asc,
          qs.next_review_at asc nulls last
      ) as rn
    from app.user_question_state qs
    where qs.user_id = v_user_id
      and qs.curriculum = v_curriculum
      and (
        qs.dominant_error_type in (
          'plazo',
          'excepcion',
          'negacion',
          'literalidad',
          'distractor_cercano',
          'organo_competente',
          'confusion_entre_normas',
          'lectura_rapida',
          'sobreconfianza'
        )
        or (
          qs.mastery_level <= 1
          and exists (
            select 1
            from public.preguntas p
            where coalesce(to_jsonb(p)->>'id', '') = qs.question_id
              and app.is_anti_trap_question(to_jsonb(p))
          )
        )
      )
  ),
  heuristic_questions as (
    select
      coalesce(to_jsonb(p)->>'id', '') as question_id,
      'heuristic'::text as source_bucket,
      row_number() over (
        order by
          case
            when trim(coalesce(to_jsonb(p)->>'numero', '')) ~ '^-?\d+$'
              then (to_jsonb(p)->>'numero')::integer
            else null
          end asc nulls last,
          coalesce(to_jsonb(p)->>'id', '')
      ) as rn
    from public.preguntas p
    where coalesce(to_jsonb(p)->>'id', '') <> ''
      and app.is_anti_trap_question(to_jsonb(p))
  ),
  seed as (
    select rs.question_id, rs.source_bucket, rs.rn
    from risky_states rs
    where rs.rn <= ceil(v_limit * 0.7)::integer

    union all

    select hq.question_id, hq.source_bucket, 1000 + hq.rn
    from heuristic_questions hq
    where not exists (
      select 1
      from risky_states rs
      where rs.question_id = hq.question_id
    )
  )
  select
    to_jsonb(p) as payload,
    seed.source_bucket
  from seed
  join public.preguntas p
    on coalesce(to_jsonb(p)->>'id', '') = seed.question_id
  order by seed.rn
  limit v_limit;
end;
$$;

grant execute on function app.is_anti_trap_question(jsonb) to authenticated;
grant execute on function app.get_anti_trap_batch(text, integer) to authenticated;

commit;
