# Lumen

A Next.js 16 App Router app to discover and manage work-friendly spaces (cafés, coworking, etc.) with Supabase as backend. Users can browse cities, filter workspaces, save/visit places, and write reviews. Profiles stay in sync with the navbar.

## Tech Stack
- Next.js 16 (App Router), TypeScript, React 19
- shadcn/ui + Tailwind CSS 4, lucide-react icons
- Supabase (auth, DB, storage, RLS)

## Features
- **City & workspace browsing:** filters for amenities and “Saved”; workspace detail pages with photos, ratings, and reviews.
- **Location quality:** map pin placement, optional autocomplete providers, reverse-geocoded address fallback, and admin location correction.
- **Saved & visited:** dedicated pages `/saved` and `/visited`; quick actions on workspace detail; stats on profile.
- **Reviews:** write/read reviews with ratings.
- **Submissions:** users can add places, track pending/needs-fixes/live/rejected status in `/profile/my-workspaces`, and see admin reasons.
- **Trust & moderation:** admin workspace review, submitter-facing reasons, internal notes, individual photo moderation, edit suggestions, and city maintenance.
- **Profile:** view-only profile header with join date; edit at `/profile/edit`; navbar auto-refreshes on profile updates.
- **Toasts & utilities:** reusable toast hook/component; shared Supabase helpers; centralized types/constants.

## Project Structure
```
app/
  admin/         # admin workspace and city moderation
  cities/        # city list + city detail
  saved/         # saved workspaces
  visited/       # visited workspaces
  profile/       # profile view + /profile/edit
components/
  features/      # feature components (workspace, review, auth, navigation)
  shared/        # shared UI (logo, uploads)
  ui/            # shadcn primitives
hooks/           # useToast, useProfile, useSavedWorkspace, useVisitedWorkspace
lib/
  api/           # profiles, workspaces, reviews, saved, visited
  constants/     # filters
  features/      # domain-specific client actions shared by pages
  types/         # shared types
  utils/         # supabase utils, cn
supabase/
  migrations/    # SQL migrations incl. saved/visited tables
docs/            # project docs
```

## Environment Variables
Create `.env.local` from `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
GEOAPIFY_API_KEY=optional-geocoding-key
LOCATIONIQ_API_KEY=optional-fallback-geocoding-key
```
`.env.local` is gitignored—never commit secrets.

Location search uses `GEOAPIFY_API_KEY` first, then `LOCATIONIQ_API_KEY`. If neither is configured, users can still place a pin manually on the map. Pin clicks and drags also try a cached OpenStreetMap Nominatim reverse lookup so the address, city, and country can be filled without an autocomplete key.

## Setup
```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
```

## Database & Migrations (Supabase)
Key tables/policies: `saved_workspaces`, `visited_workspaces`, `reviews`, `profiles`, `workspaces`, `cities`, `workspace_photos`, `workspace_edit_suggestions`.
Run migrations (Supabase CLI):
```bash
supabase db push
```

The trust/location migration adds moderation metadata, edit suggestions, photo review fields, city cleanup helpers, and RPCs for atomic suggestion reporting and city merges. Run it before testing `/admin/cities`, edit suggestions, admin notes, or photo moderation.

## Usage Notes
- “Saved” filter on city page requires login; filters workspaces saved by the user in that city.
- Navbar “Saved” links to `/saved`; profile cards link to `/saved` and `/visited`.
- Quick actions on workspace detail: Save, Mark as Visited, Write Review, Suggest an Edit.
- Admin routes: `/admin/workspaces`, `/admin/workspaces/[id]`, and `/admin/cities`.
- Rejected and needs-fixes submissions should include a submitter-facing reason from the admin detail page.

## Conventions
- Kebab-case files; feature-based folders.
- Put domain-specific shared page logic in `lib/features/<domain>/`.
- Prefer small client components for stateful UI and keep data/mutation orchestration out of page files where practical.
- shadcn/ui + Tailwind for styling.
- Conventional Commits recommended.
