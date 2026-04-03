begin;

do $$
begin
  if to_regclass('public.question_highlight_overrides') is null then
    raise notice 'public.question_highlight_overrides does not exist, skipping admin RLS migration.';
    return;
  end if;

  execute 'alter table public.question_highlight_overrides enable row level security';

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'question_highlight_overrides'
      and policyname = 'question_highlight_overrides_insert_admin'
  ) then
    create policy question_highlight_overrides_insert_admin
      on public.question_highlight_overrides
      for insert
      to authenticated
      with check (
        app.is_admin()
        and created_by = auth.uid()
        and updated_by = auth.uid()
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'question_highlight_overrides'
      and policyname = 'question_highlight_overrides_update_admin'
  ) then
    create policy question_highlight_overrides_update_admin
      on public.question_highlight_overrides
      for update
      to authenticated
      using (app.is_admin())
      with check (
        app.is_admin()
        and updated_by = auth.uid()
      );
  end if;
end $$;

commit;
