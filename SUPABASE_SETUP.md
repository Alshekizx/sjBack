# Supabase setup and verification

Both apps must use the same project URL and public anon/publishable key in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Never put a service-role key in Vite variables. Restart Vite after changing environment files.

The configured project hostname returned `ENOTFOUND` during verification. Confirm the URL from Supabase Project Settings → API and that the project exists and is active. A matching configuration in both apps does not prove that the project is reachable.

## Database and function deployment

For an existing database, apply unapplied SQL files in `supabase/migrations` in filename order using the Supabase SQL Editor. The new migration is `202610170001_admin_login_access.sql`. For a new database, `supabase/schema.sql` includes the complete setup; do not run it as a reset against an existing database.

From this directory with the Supabase CLI authenticated:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy make-server-f63d7d22
```

`supabase/config.toml` disables gateway JWT verification because the Paystack webhook uses HMAC. Every admin route verifies the caller's Auth token; user payment routes also verify Auth tokens. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the deployed function. Configure payment secrets separately using `supabase/.env.example`; these stay server-side.

The canonical server is `supabase/functions/make-server-f63d7d22/index.ts`; the old `server/index.tsx` imports it to avoid divergent endpoints.

## First super administrator

An existing super administrator can add others from **Admin Users**. If none exists, create your own Auth account in Supabase Authentication, then run this once in the SQL Editor:

```sql
select public.bootstrap_first_super_admin('YOUR_EMAIL');
```

For an existing installation with administrator profiles, the schema also provides `grant_super_admin_by_email` for the database owner. Sign out and sign in after assigning the first role. Public signup cannot grant administrator access.

## Managing administrators

Sign in as a super administrator, open **Admin Users**, then **Add Admin**. For a new account, enter a name, email, password (at least 12 characters), and role. The server creates a confirmed Supabase Auth account; the administrator can immediately use those credentials. Provide the credentials privately.

For an existing Auth user, select **Assign access to an existing account**. Their password is preserved. Roles and active status are editable in the table. You cannot change your own access. Deactivation blocks admin APIs immediately; the migration also makes database policies check current access instead of stale JWT claims. Administrator accounts are not deleted when deactivated.

## Checks

From the parent workspace:

```sh
node scripts/check-public-supabase.mjs
node --test adminWebsite/tests/*.test.mjs userWebsite/tests/*.test.mjs
```

Also run `npx tsc --noEmit` and `npm run build` in each app. After deployment, verify with disposable accounts: create an administrator, sign in with it, change its role, deactivate it, and confirm its requests are rejected. Publish a level/course/lesson in the admin app and confirm it appears for an eligible student with trial/subscription access. Check media upload and signed downloads, notifications, profile edits, and Paystack test payments. Live authenticated checks were not possible without a reachable project and authenticated test accounts.

Admin and student apps use separate browser auth storage keys, so signing into one does not replace the other's session on localhost. Existing browser sessions will require a fresh login after this change.
