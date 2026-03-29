begin;

drop function if exists app.get_law_practice_batch(text, text, integer);
create or replace function app.get_law_practice_batch(
  p_law text,
  p_curriculum text default 'general',
  p_batch_size integer default 20
)
returns table (
  payload jsonb
)
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_batch_size, 20), 100));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return query
  select to_jsonb(p) as payload
  from public.preguntas p
  where coalesce(to_jsonb(p)->>'id', '') <> ''
    and (to_jsonb(p)->>'curriculum' is null or (to_jsonb(p)->>'curriculum') = coalesce(p_curriculum, 'general'))
    and to_jsonb(p)->>'ley_referencia' = p_law
  order by random()
  limit v_limit;
end;
$$;

grant execute on function app.get_law_practice_batch(text, text, integer) to authenticated;

commit;
