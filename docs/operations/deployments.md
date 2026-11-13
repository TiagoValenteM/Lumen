# Deploying Lumen

Vercel deploys GitHub `main` to production. A Vercel Preview is only a staging environment if it is connected to a separate database. See [Vercel's Git deployment guide](https://vercel.com/docs/git) for how the environments are selected.

## Release checklist

1. Run lint, type checks, tests, and a production build. For a schema change, test it in isolated staging first.
2. Verify the target Supabase project and its applied migrations. Back up affected production data before writes. Keep backups private; a database archive does not include uploaded Storage file bytes.
3. Apply only the required, reviewed migrations. Keep schema changes compatible with the live app or coordinate the app and database cutover. Never run the staging bootstrap against production.
4. Push the reviewed commit to `main`, wait for Vercel to report that exact commit ready, then check public browsing, the changed workflow, and relevant access boundaries on the live domain.

## Legacy security rollout

- Prefer an isolated Supabase staging project. Confirm Preview does not point to the production database before using test accounts or running the write-enabled smoke test. Back up the production database before applying permissions changes. If the owner elects a direct production cutover, first wait for any restoration to finish, verify a usable pre-change backup, and schedule a short write interruption. Do not run staging fixtures or the staging bootstrap on production.
- In the Supabase SQL editor, run `SELECT id FROM public.profiles WHERE is_admin IS TRUE;`. Verify each ID against trusted operator accounts in Auth. Remove unrecognized legacy grants before the migration seeds the private admin table. Review access and moderation activity if any assignment is unexpected.
- Verify the existing trust/location, profile email/tag, edit-suggestion, and AI enrichment schema migrations are installed. The repository contains older migration files with shared version prefixes; reconcile the remote history before using the CLI. Do not replay historical migrations blindly on a live project.
- Rotate any provider credentials previously shared outside the hosting secret store. Configure `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret in each environment, and configure `OPENROUTER_API_KEY` where AI should run. Never use a `NEXT_PUBLIC_` prefix for secrets.
- With no scheduled backup, use a private local [manual backup](https://supabase.com/docs/guides/platform/backups) with PostgreSQL connection credentials, not the project's public or server API key. Confirm the project reference, verify the export can be read and contains the affected schemas and data, and keep it outside the repository. A database backup is not a backup of uploaded Storage files.

Run the [read-only rollout audit](../../supabase/checks/lumen-rollout.sql) before and after applying migrations. It checks baseline objects and selected grants without returning user data. Its results do not replace migration-history or full policy verification. See [Supabase's migration guide](https://supabase.com/docs/guides/deployment/database-migrations).

### Historical migration order

Production already received this series. Use the list to audit a legacy environment, not as a script to rerun.

1. `20260731_workspace_ai_review_workflow.sql`, if missing.
2. `20261112000100_lock_down_moderation_permissions.sql`.
3. `20261112000200_make_ai_review_atomic.sql`.
4. `20261112000300_limit_geocoding_requests.sql`.
5. `20261112000400_submit_workspace_with_city_proposal.sql`.
6. `20261112000500_verify_workspace_work_facts.sql`.
7. `20261112000600_limit_spot_interpretation.sql`.
8. `20261113000100_normalize_swiss_city_country.sql` corrects legacy Swiss country labels without changing city IDs or slugs. Apply it before deploying the country normalization so submissions match existing Swiss cities.

Coordinate migration and deployment: prepare and verify the app build before changing production permissions. The old application cannot write profile email or AI rows after the permission change. In-flight legacy AI jobs are marked failed during the cutover and can be rerun by a moderator. Do not restore the old writable grants when rolling back an app build. Leave `FIND_A_SPOT_AI_ENABLED` off until the post-deploy checks pass.

After migration, admin authority comes from `lumen_private.admin_roles`, not `profiles.is_admin`. Verify that the private table has the expected IDs. Grant or revoke access there only using trusted database operator access; legacy profile flags no longer control access. Account email is read from Supabase Auth, and workspace moderation notes are available to moderators only.

## Browser smoke tests

- The [development guide](../engineering/development.md) covers the local checks. The database suite exercises SQL privileges and RLS in embedded PostgreSQL, without staging credentials.
- The browser smoke test needs a running app connected to a disposable staging database with the migrations applied. Create one regular test account and one moderator test account there. Install Chromium with `pnpm exec playwright install chromium`, then run `pnpm test:e2e` with these environment variables:
  - `LUMEN_E2E_ALLOW_WRITES=staging` and `LUMEN_E2E_BASE_URL` (the staging app).
  - `LUMEN_E2E_SUPABASE_URL`, `LUMEN_E2E_SUPABASE_PUBLISHABLE_KEY`, and `LUMEN_E2E_SUPABASE_SECRET_KEY` (the same staging database).
  - `LUMEN_E2E_MEMBER_EMAIL`, `LUMEN_E2E_MEMBER_PASSWORD`, `LUMEN_E2E_ADMIN_EMAIL`, and `LUMEN_E2E_ADMIN_PASSWORD`.
- The browser test inserts and removes a disposable place and city, uses deterministic AI suggestions, and verifies that Find a Spot treats unknown facts correctly. Separately submit a real staging place to verify the OpenRouter provider, background execution and geocoding credentials.
- Check the city map and map pin on desktop and mobile. MapLibre 5.24.1 includes the maintainer's sanitizer backport and avoids the WebGL2-only 6.x upgrade. The npm audit feed may still flag it because its affected range omits the patched 5.x branch; see [the maintainer advisory](https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579).

## Runtime behavior

- Member-triggered enrichment is accepted once for a pending submission. A moderator can retry terminal runs. A database lock and unique index reject overlapping runs even across browser tabs.
- Model work is bounded to 95 seconds inside a 120-second route. It runs after the response, not in a durable queue. If an invocation is interrupted, a stale run is marked failed on reviewer polling or retry after three minutes. A late worker cannot overwrite the failed state.
- Applying fields stages them locally. Saving the workspace and marking the selected AI fields applied happen in one database transaction. Rejected fields cannot be applied later.
- Geocoding permits 30 provider attempts per signed-in user per minute and 1,000 per provider per UTC day, with a shared one-second spacing for Nominatim. Provider failures fall through to the next configured provider; each attempt checks the quota separately and times out after five seconds. The map pin and manual entry are still available.

## Find a Spot Pilot

After the work-fact migration, run the [read-only pilot counts](../../supabase/checks/find-a-spot-pilot.sql) to find cities with enough checked listings. Existing work facts start unchecked. Choose a pilot city and verify real laptop policies, stay limits, Wi-Fi and outlets in moderation. See the [Find a Spot notes](../product/find-a-spot.md) for the AI flag and pilot criteria.
