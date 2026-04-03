begin;

alter table public.user_opposition_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_opposition_profiles'
      and policyname = 'user_opposition_profiles_select_own'
  ) then
    create policy user_opposition_profiles_select_own
      on public.user_opposition_profiles
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_opposition_profiles'
      and policyname = 'user_opposition_profiles_insert_own'
  ) then
    create policy user_opposition_profiles_insert_own
      on public.user_opposition_profiles
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_opposition_profiles'
      and policyname = 'user_opposition_profiles_update_own'
  ) then
    create policy user_opposition_profiles_update_own
      on public.user_opposition_profiles
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

commit;
