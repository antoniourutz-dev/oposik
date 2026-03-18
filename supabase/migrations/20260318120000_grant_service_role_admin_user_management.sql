begin;

grant select, update, delete on app.user_profiles to service_role;
grant select, update, delete on app.user_roles to service_role;
grant select, update, delete on app.username_registry to service_role;
grant select, update, delete on app.username_change_history to service_role;
grant select, delete on public.game_results to service_role;

commit;
