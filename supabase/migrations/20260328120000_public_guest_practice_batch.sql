begin;

grant usage on schema app to anon;

create or replace function app.get_public_guest_practice_batch(
  p_curriculum text default 'general',
  p_batch_size integer default 20
)
returns table (
  payload jsonb
)
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_batch_size, 20), 20));
begin
  return query
  select to_jsonb(p) as payload
  from public.preguntas p
  where coalesce(to_jsonb(p)->>'id', '') <> ''
  order by random()
  limit v_limit;
end;
$$;

grant execute on function app.get_public_guest_practice_batch(text, integer) to anon, authenticated;

commit;
