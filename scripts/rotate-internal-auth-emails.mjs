import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.env.DRY_RUN === '1';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const makeInternalEmail = (userId) => `u_${userId.replace(/-/g, '')}@auth.korrika.invalid`;

async function main() {
  const { data: rows, error } = await supabaseAdmin
    .schema('app')
    .from('username_registry')
    .select('user_id, username')
    .eq('is_current', true)
    .order('assigned_at', { ascending: true });

  if (error) {
    throw error;
  }

  for (const row of rows ?? []) {
    const internalEmail = makeInternalEmail(row.user_id);
    if (dryRun) {
      console.log(`[dry-run] ${row.user_id} -> ${internalEmail}`);
      continue;
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      email: internalEmail,
      email_confirm: true,
      user_metadata: { username: row.username },
    });

    if (updateError) {
      throw updateError;
    }

    console.log(`Updated ${row.user_id} -> ${internalEmail}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
