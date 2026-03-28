begin;

create or replace function app.question_matches_scope(
  p_payload jsonb,
  p_question_scope text default 'all'
)
returns boolean
language sql
immutable
as $$
  select
    case
      when coalesce(nullif(lower(trim(p_question_scope)), ''), 'all') = 'all' then true
      else app.normalize_question_scope(
        coalesce(
          p_payload->>'grupo',
          p_payload->>'question_scope',
          p_payload->>'scope',
          p_payload->>'scope_key',
          p_payload->>'temario_tipo',
          p_payload->>'tipo_temario',
          p_payload->>'question_track',
          p_payload->>'track',
          p_payload->>'tipo'
        )
      ) = app.normalize_question_scope(p_question_scope)
    end;
$$;

grant execute on function app.question_matches_scope(jsonb, text) to anon, authenticated;

commit;
