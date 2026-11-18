# Local Development

Use Node.js 24 and pnpm 10, as in [GitHub Actions](../../.github/workflows/checks.yml). The [live demo](https://lumen-lime.vercel.app/find) needs no local setup.

## Run the app

1. Run `pnpm install --frozen-lockfile` and create `.env.local` from [`.env.example`](../../.env.example).
2. Use an isolated Supabase project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` to that project's URL and publishable key.
3. For a fresh, empty project, run `node scripts/build-staging-bootstrap.mjs` and execute the generated SQL in that project's SQL Editor. The bootstrap creates the schema, policies, and buckets in one transaction and refuses to run over an existing Lumen schema. It does not import production data.
4. Run `pnpm dev` and open [localhost:3000](http://localhost:3000). An empty database shows no cities until places are approved. For local browsing only, the [sample seed](../../supabase/seed_data.sql) adds example listings with illustrative facts; never use it in production.

## Optional services

| Environment variable | What it enables |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Server-only quota checks for address lookup and background AI. `SUPABASE_SERVICE_ROLE_KEY` is the legacy alternative. Keep either one out of browser code. |
| `GEOAPIFY_API_KEY`, `LOCATIONIQ_API_KEY` | Server-side address providers. Lookup falls back to Photon for search and Nominatim for pin lookup, with per-provider quotas. The [OpenFreeMap basemap](https://openfreemap.org/quick_start/) uses no key and does not depend on a geocoder. |
| `OPENROUTER_API_KEY` | Optional place research for moderation. The core finder uses local parsing. Its separate `FIND_A_SPOT_AI_ENABLED` flag is off by default. |

Store credentials in `.env.local` or environment-scoped hosting secrets. For moderation testing, create dedicated staging accounts and provision a moderator in `lumen_private.admin_roles` using trusted database access. Never point test accounts, fixtures, or seed commands at production.

## Checks

```bash
pnpm lint
pnpm exec next typegen
pnpm typecheck
pnpm test
pnpm build
```

Unit and embedded PostgreSQL tests run without Supabase credentials. The build may need network access for fonts. The [deployment runbook](../operations/deployments.md#browser-smoke-tests) lists what the write-enabled Playwright suite needs on a disposable staging database.

## Browser tests without credentials

```bash
pnpm exec playwright install chromium webkit
pnpm test:e2e:local --browser=chromium
pnpm test:e2e:local --browser=webkit
```

The command compiles a separate fixture build with loopback configuration and shuts down its test servers afterwards. Stop any development server sharing the same build directory first. It does not use the Supabase project in `.env.local`. On a failure, open the generated trace under `test-results/` with `pnpm exec playwright show-trace <trace.zip>`. GitHub Actions runs both browser engines and uploads traces only for fixture failures. Its official Playwright container includes browser binaries and system dependencies, avoiding a fresh OS package installation on each run. When updating `@playwright/test`, update the workflow's container version and verified digest together.

| Layer | What it exercises |
| --- | --- |
| Unit | Availability, time zones, URL filters, AI parsing, and import safeguards. |
| Database integration | PostgreSQL migrations, transactional imports, moderation, RLS, and concurrent edits in PGlite. |
| Browser, isolated | Public browsing, maps, navigation, sign-in return paths, photos, and moderation flows with fixtures. |
| Browser, staging only | Real account, Storage and publication flow; enable only with the disposable target described in the runbook. |

The city-discovery regression suite checks 320, 390, 768, 1024 and 1440 px layouts plus phone landscape. It covers the shared scroll frame, compact mobile collections, filter recovery, the add-place link, and granted/denied geolocation. The moderation and review suites also check narrow-screen actions and accessible suggestion labels. Location in these tests is simulated, never the operator's real position.
