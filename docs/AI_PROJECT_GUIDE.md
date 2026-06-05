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

## Feature Module Plan

Move shared business behavior toward domain folders. File names should describe the job they do, not the CRUD pattern they happen to use.

```txt
lib/features/
  cities/
    city-repository.ts
    city-lifecycle.ts
    city-normalization.ts
  locations/
    geocoding.ts
    reverse-geocoding.ts
    location-normalization.ts
  moderation/
    workspace-review-actions.ts
    photo-review-actions.ts
    suggestion-review-actions.ts
  workspace-submissions/
    submission-actions.ts
    submission-repository.ts
    duplicate-detection.ts
    submission-validation.ts
  workspaces/
    workspace-queries.ts
    workspace-mappers.ts
    workability-report.ts
```

Use this split as the target shape:

- `*-repository.ts`: isolated Supabase reads/writes and migration compatibility fallbacks.
- `*-actions.ts`: server actions or route-callable workflows that compose repositories and validation.
- `*-validation.ts`: schemas, input guards, and user-facing validation errors.
- `*-mappers.ts`: database rows to UI/domain models.
- `*-normalization.ts`: slug, address, city, and coordinate cleanup helpers.
- `*-lifecycle.ts`: cross-record rules such as creating the new city and pruning an empty old city.

Route-local `_lib` is still fine when a behavior is only used by one route. Promote it into `lib/features/<domain>` when a second route needs it or when tests would be easier around a pure domain helper.

## Slow Extraction Order

Follow this order to keep behavior stable:

1. Move pure helpers first, such as scoring, city normalization, and duplicate fingerprints.
2. Move read mappers next, keeping page queries unchanged.
3. Move write orchestration into named actions after the types are stable.
4. Add tests around moved helpers before changing related UI.
5. Extract UI sections after data contracts stop moving.

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

## UI Design Rules

Lumen should follow modern website principles without becoming a heavy custom visual system.

Use the existing UI primitives first:

- `components/ui/card.tsx` for framed content.
- `components/ui/button.tsx` for actions.
- `components/ui/badge.tsx` for compact metadata.
- `components/ui/input.tsx`, `textarea.tsx`, and `select.tsx` for forms.

Keep the design direction restrained:

- Prefer open hero layouts over boxed hero banners.
- Prefer `rounded-xl`, subtle shadows, and low-contrast borders for content cards.
- Use translucent `bg-background/70`, `bg-card/90`, or `bg-muted/20` sparingly for softer surfaces.
- Keep borders when they improve scanability, but use `border-border/60` instead of strong outlines.
- Hover states should feel responsive but quiet: small lift, soft shadow, or a background change.
- Avoid decorative gradients, oversized glass panels, strong glow effects, and page-wide visual treatments.
- Do not restyle every route locally if the same result belongs in `components/ui`.

When improving UI, make the smallest shared primitive change that improves multiple screens, then only add route-level styling where the content genuinely needs it.

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
