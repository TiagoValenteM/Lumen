# Architecture

Lumen uses Next.js App Router, TypeScript, Supabase PostgreSQL/Auth/Storage, and MapLibre. Vercel serves the app from GitHub `main`.

## Three paths through the app

**Find a place.** [Find a Spot](../../app/find) loads a city's approved listings and their work-fact check dates. A [pure matcher](../../lib/features/find-a-spot/matching.ts) returns matches and places that still need verification. Plain-English requests and manual controls set the same URL filters. Exact device location stays in the browser, and the map loads on demand.

**Submit a place.** [Add a Place](../../app/add-workspace) combines address search with an adjustable map pin. The [geocoding routes](../../app/api/geocode) authenticate the user and enforce server-side quotas before contacting providers. The submission RPC commits the place and its photo records together and accepts retries with the same draft ID. A proposed city stays off the public directory until approval.

**Moderate a listing.** The [moderation editor](../../app/admin/workspaces) lets a reviewer inspect a saved preview, correct facts, moderate photos, and publish. [Optional AI research](../../lib/features/workspace-enrichment) supplies suggestions and available evidence. A reviewer decides which fields to save; the database records those decisions with the workspace update. AI never publishes a listing.

## Where things live

| Directory | Owns |
| --- | --- |
| [`app/`](../../app) | Routes and request handlers. Route-only UI, hooks, and helpers stay in `_components`, `_hooks`, and `_lib`. |
| [`components/`](../../components) | Shared interface primitives and reusable feature components. |
| [`lib/features/`](../../lib/features) | Domain logic shared by routes: matching, submissions, location lookup, and moderation. |
| [`lib/supabase/`](../../lib/supabase) | Browser, server, and privileged Supabase clients. |
| [`supabase/`](../../supabase) | Migrations, policies, and database checks. |
| [`tests/`](../../tests) | Matching, location, and AI tests; PostgreSQL permission tests; a staging browser suite. |
| [`scripts/`](../../scripts) | Staging bootstrap and [operator-only import tools](../operations/location-imports.md). |

See the [data model](data-model.md) for ownership and public access, and [project conventions](project-conventions.md) for where to put new code.
