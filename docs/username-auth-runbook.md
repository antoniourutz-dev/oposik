# Username Auth Runbook

## Deploy order

1. Run [20260306_username_auth.sql](/c:/Users/galle/Documents/GitHub/Korrika_zorn/supabase/sql/20260306_username_auth.sql) in Supabase SQL Editor or as a migration.
2. Add `app` to Supabase `API > Exposed schemas`.
3. Deploy [login-with-username](/c:/Users/galle/Documents/GitHub/Korrika_zorn/supabase/functions/login-with-username/index.ts).
4. Run [rotate-internal-auth-emails.mjs](/c:/Users/galle/Documents/GitHub/Korrika_zorn/scripts/rotate-internal-auth-emails.mjs) with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Seed admin roles if needed:

```sql
insert into app.user_roles (user_id, role, granted_by)
values ('<admin-user-id>', 'admin', '<admin-user-id>')
on conflict do nothing;
```

## Admin queries

Current username:

```sql
select username
from app.username_registry
where user_id = '<user-id>'
  and is_current = true;
```

Historical usernames:

```sql
select username, is_current, assigned_at, retired_at
from app.username_registry
where user_id = '<user-id>'
order by assigned_at desc;
```

Search by any username:

```sql
select *
from app.admin_find_user_by_any_username('<username>');
```

Chronology:

```sql
select *
from app.admin_get_username_timeline('<user-id>');
```

## Manual test checklist

- Login succeeds with the current username and the existing password.
- Login fails with an old username after a rename.
- Changing to an already reserved username fails with a collision error.
- Changing to the same username fails with `username_unchanged`.
- Historical usernames remain searchable through `admin_find_user_by_any_username`.
- `username_registry` keeps exactly one `is_current = true` row per user.
- `username_change_history` stores `old_username`, `new_username`, `changed_at` and `changed_by`.

## Security notes

- Keep public signup disabled in Supabase Auth.
- Never expose the service-role key in the browser.
- Apply rate limiting to the `login-with-username` edge function.
- Treat usernames as immutable once retired to preserve auditability.
