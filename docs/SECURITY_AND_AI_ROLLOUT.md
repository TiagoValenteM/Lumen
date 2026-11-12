# Security and AI rollout

## Resume when access is available

- The tested release is commit `90d94ab` on local branch `codex/lumen-security-rollout`. It has not been pushed or deployed, and no production migration has been run.
- The connected Vercel account could not open Lumen. Resume after the owner opens the signed-in Lumen Vercel project and matching Supabase dashboard. Do not ask for credentials in chat.
- Start with read-only checks: match the Vercel project to the GitHub repo and the production Supabase project, confirm Preview uses a different database, record the currently live deployment, and verify backups and legitimate admins. Run the staging browser test before the production cutover.

## 1. Verify the current project

- Use an isolated Supabase staging project first. Confirm Preview does not point to the production database. Back up the production database before applying permissions changes.
- In the Supabase SQL editor, run `SELECT id FROM public.profiles WHERE is_admin IS TRUE;`. Verify each ID against trusted operator accounts in Auth. Remove unrecognized legacy grants before the migration seeds the private admin table. Review access and moderation activity if any assignment is unexpected.
- Verify the existing trust/location, profile email/tag, edit-suggestion, and AI enrichment schema migrations are installed. The repository contains older migration files with shared version prefixes; reconcile the remote history before using the CLI. Do not replay historical migrations blindly on a live project.
- Rotate any provider credentials previously shared outside the hosting secret store. Configure `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret in each environment, and configure `OPENROUTER_API_KEY` where AI should run. Never use a `NEXT_PUBLIC_` prefix for secrets.

This read-only query checks the expected baseline and rollout objects without returning user data. Use it on both environments after confirming the project identity. Object presence does not prove a migration was applied or its permissions are correct.

```sql
SELECT
  to_regclass('public.profiles') IS NOT NULL AS profiles_present,
  to_regclass('public.workspaces') IS NOT NULL AS workspaces_present,
  to_regclass('public.workspace_photos') IS NOT NULL AS photos_present,
  to_regclass('public.workspace_edit_suggestions') IS NOT NULL AS edit_suggestions_present,
  to_regclass('public.workspace_ai_enrichments') IS NOT NULL AS enrichment_present,
  to_regclass('lumen_private.admin_roles') IS NOT NULL AS private_admin_roles_present,
  to_regprocedure('public.save_workspace_ai_review(uuid,uuid,jsonb,text[])')
    IS NOT NULL AS atomic_review_present,
  to_regprocedure('public.take_geocoding_slot(uuid,text)')
    IS NOT NULL AS geocode_limit_present;
```

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

## First-place submissions follow-up

On `codex/lumen-submission-reliability`, apply `20261112000400_submit_workspace_with_city_proposal.sql` **after** the four migrations above and before deploying that branch. The follow-up expects the baseline photo-primary and city-count triggers. The earlier security-only release does not need this fifth migration.

Members can submit a new city without permission to write the public cities table. The workspace and photo records are created together; the city is only created or linked when the place is approved. Photo files are still uploaded to Storage before submission and can be retried from the draft. Run the staging browser test against an isolated database with this migration applied.

## Work-fact checks follow-up

Apply `20261112000500_verify_workspace_work_facts.sql` after the first-place migration before testing the current branch. Existing work facts are preserved and start unchecked; only an explicit moderator action records a check. Test the no/unknown distinction, public check date, and invalidation after a relevant edit. The moderator's user ID is not public.
