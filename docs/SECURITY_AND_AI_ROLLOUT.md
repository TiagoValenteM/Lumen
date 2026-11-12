# Security and AI rollout

## 1. Verify the current project

- Use an isolated Supabase staging project first. Confirm Preview does not point to the production database. Back up the production database before applying permissions changes.
- In the Supabase SQL editor, run `SELECT id FROM public.profiles WHERE is_admin IS TRUE;`. Verify each ID against trusted operator accounts in Auth. Remove unrecognized legacy grants before the migration seeds the private admin table. Review access and moderation activity if any assignment is unexpected.
- Verify the existing trust/location, profile email/tag, edit-suggestion, and AI enrichment schema migrations are installed. The repository contains older migration files with shared version prefixes; reconcile the remote history before using the CLI. Do not replay historical migrations blindly on a live project.
- Rotate any provider credentials previously shared outside the hosting secret store. Configure `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret in each environment, and configure `OPENROUTER_API_KEY` where AI should run. Never use a `NEXT_PUBLIC_` prefix for secrets.

## 2. Apply migrations in order, then deploy the app

1. `20260731_workspace_ai_review_workflow.sql`, if missing.
2. `20261112000100_lock_down_moderation_permissions.sql`.
3. `20261112000200_make_ai_review_atomic.sql`.
4. `20261112000300_limit_geocoding_requests.sql`.

Coordinate migration and deployment: the old application cannot write profile email or AI rows after the permission change. In-flight legacy AI jobs are marked failed during the cutover and can be rerun by a moderator. Do not restore the old writable grants when rolling back an app build.

After migration, admin authority comes from `lumen_private.admin_roles`, not `profiles.is_admin`. Verify that the private table has the expected IDs. Grant or revoke access there only using trusted database operator access; legacy profile flags no longer control access. Account email is read from Supabase Auth, and workspace moderation notes are available to moderators only.

## 3. Verify before production

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` run without staging credentials. The database suite exercises actual SQL privileges and RLS, using embedded PostgreSQL and local stand-ins for the Supabase Auth roles.
- The browser smoke test needs a running app connected to a disposable staging database with the migrations applied. Create one regular test account and one moderator test account there. Install Chromium with `pnpm exec playwright install chromium`, then run `pnpm test:e2e` with these environment variables:
  - `LUMEN_E2E_ALLOW_WRITES=staging` and `LUMEN_E2E_BASE_URL` (the staging app).
  - `LUMEN_E2E_SUPABASE_URL`, `LUMEN_E2E_SUPABASE_PUBLISHABLE_KEY`, and `LUMEN_E2E_SUPABASE_SECRET_KEY` (the same staging database).
  - `LUMEN_E2E_MEMBER_EMAIL`, `LUMEN_E2E_MEMBER_PASSWORD`, `LUMEN_E2E_ADMIN_EMAIL`, and `LUMEN_E2E_ADMIN_PASSWORD`.
- The browser test inserts and removes a disposable place and city, and uses deterministic AI suggestions. Separately submit a real staging place to verify the OpenRouter provider, background execution and geocoding credentials.
- Check the city map and map pin on desktop and mobile. MapLibre 5.24.1 includes the maintainer's sanitizer backport and avoids the WebGL2-only 6.x upgrade. The npm audit feed may still flag it because its affected range omits the patched 5.x branch; see [the maintainer advisory](https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579).

## Runtime behavior

- Member-triggered enrichment is accepted once for a pending submission. A moderator can retry terminal runs. A database lock and unique index reject overlapping runs even across browser tabs.
- Model work is bounded to 95 seconds inside a 120-second route. It runs after the response, not in a durable queue. If an invocation is interrupted, a stale run is marked failed on reviewer polling or retry after three minutes. A late worker cannot overwrite the failed state.
- Applying fields stages them locally. Saving the workspace and marking the selected AI fields applied happen in one database transaction. Rejected fields cannot be applied later.
- Geocoding permits 30 lookups per signed-in user per minute and 1,000 lookups per provider per UTC day, with a shared one-second spacing for Nominatim. The defaults can be changed in a migration to match actual provider quotas. Provider requests time out after five seconds; manual entry is still available.
