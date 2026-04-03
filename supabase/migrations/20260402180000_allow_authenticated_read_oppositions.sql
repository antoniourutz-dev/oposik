begin;

alter table public.oppositions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'oppositions'
      and policyname = 'oppositions_read_authenticated'
  ) then
    create policy oppositions_read_authenticated
      on public.oppositions
      for select
      to authenticated
      using (is_active = true);
  end if;
end $$;

commit;
