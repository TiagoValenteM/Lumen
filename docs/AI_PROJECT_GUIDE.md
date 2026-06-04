# AI Project Guide

This guide is for AI/code agents working on Lumen. Use it before changing structure, data flows, or UI.

## Product Shape

Lumen is a Next.js App Router app for discovering and moderating work-friendly places. The important trust loop is:

- Users submit places through `/add-workspace`.
- Submitters track status in `/profile/my-workspaces`.
- Admins review places in `/admin/workspaces` and `/admin/workspaces/[id]`.
- Public users suggest corrections from workspace detail pages.
- Admins manage city data in `/admin/cities`.

## Directory Conventions

Use route-local modules when code belongs to one route:

```txt
app/<route>/
  page.tsx
  _components/
  _lib/
```

Use shared domain modules when code is reused by multiple routes:

```txt
lib/features/<domain>/actions.ts
```

Use generic shared modules only for truly reusable primitives:

```txt
components/shared/
components/ui/
lib/utils/
hooks/
```

Do not put route-specific business logic in `lib/utils`.

## Component Boundaries

Keep `page.tsx` focused on:

- route params
- auth gating
- top-level state
- data loading
- composing sections

Move UI sections into `_components` when they are more than a small form group, especially:

- map/location picker sections
- photo moderation grids
- suggestions/reports panels
- multi-step form steps
- repeated cards/lists

Move mutation/data orchestration into `_lib` or `lib/features` when it has:

- more than one Supabase call
- fallback behavior for old migrations
- city/workspace/photo/suggestion business rules

## Supabase Rules

- Keep RLS and database state transitions as the source of truth.
- Prefer RPCs for multi-step writes that must be atomic, such as city merges or suggestion reporting.
- Use explicit RLS roles such as `TO authenticated`.
- Include `auth.uid() IS NOT NULL` in authenticated-user policies.
- Admin-only client actions must still be backed by database admin checks.
- Be careful with `SECURITY DEFINER`; use strict checks and narrow parameters.

## Location And Moderation

- New user submissions should be `pending`.
- `under_review` means “needs fixes” and should include a submitter-facing `rejection_reason`.
- `rejected` should also include a submitter-facing reason.
- `admin_notes` are internal only.
- Public pages should show only approved workspaces/photos.
- Admin pages may load pending/unapproved data.
- City cleanup should never blindly delete a city; use guarded RPCs.

## Refactor Strategy

Prefer small, verified moves:

1. Extract types/constants.
2. Extract data/mutation helpers.
3. Extract one UI section.
4. Run `pnpm lint` and `pnpm exec tsc --noEmit`.
5. Repeat.

Avoid large behavior and structure changes in the same patch. If a refactor changes runtime behavior, call it out explicitly.

## Verification

Before finishing a meaningful change, run:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

`pnpm build` may need network access because `next/font` fetches Google Fonts.

For frontend changes, smoke test relevant local routes in the browser when possible.

## Large Files To Keep Shrinking

Current priority:

- `app/add-workspace/page.tsx`: split by form step and submit helpers.
- `app/cities/[slug]/[workspace]/page.tsx`: split action sidebar, suggest-edit dialog, reviews, and detail sections.
- `app/profile/my-workspaces/page.tsx`: split status summary and submission card if it grows further.

