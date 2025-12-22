# Lumen

A Next.js 13 App Router app to discover and manage work-friendly spaces (cafés, coworking, etc.) with Supabase as backend. Users can browse cities, filter workspaces, save/visit places, and write reviews. Profiles stay in sync with the navbar.

## Tech Stack
- Next.js 13 (App Router), TypeScript, React
- shadcn/ui + Tailwind CSS, lucide-react icons
- Supabase (auth, DB, storage, RLS)

## Features
- **City & workspace browsing:** filters for amenities and “Saved”; workspace detail pages with photos, ratings, and reviews.
- **Saved & visited:** dedicated pages `/saved` and `/visited`; quick actions on workspace detail; stats on profile.
- **Reviews:** write/read reviews with ratings.
- **Profile:** view-only profile header with join date; edit at `/profile/edit`; navbar auto-refreshes on profile updates.
- **Toasts & utilities:** reusable toast hook/component; shared Supabase helpers; centralized types/constants.

## Project Structure
```
app/
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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-public-key
```
`.env.local` is gitignored—never commit secrets.

## Setup
```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
```

## Database & Migrations (Supabase)
Key tables/policies: `saved_workspaces`, `visited_workspaces`, `reviews`, `profiles`, `workspaces`, `cities`.
Run migrations (Supabase CLI):
```bash
supabase db push
```

## Usage Notes
- “Saved” filter on city page requires login; filters workspaces saved by the user in that city.
- Navbar “Saved” links to `/saved`; profile cards link to `/saved` and `/visited`.
- Quick actions on workspace detail: Save, Mark as Visited, Write Review.

## Conventions
- Kebab-case files; feature-based folders.
- shadcn/ui + Tailwind for styling.
- Conventional Commits recommended.
