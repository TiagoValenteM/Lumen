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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
GEOAPIFY_API_KEY=optional-geocoding-key
LOCATIONIQ_API_KEY=optional-fallback-geocoding-key
OPENROUTER_API_KEY=optional-server-side-ai-enrichment-key
OPENROUTER_PLACE_ENRICHMENT_MODEL=openai/gpt-oss-20b:free
FIND_A_SPOT_AI_ENABLED=false
SUPABASE_SECRET_KEY=server-only-secret-for-ai-and-geocoding
```
`.env.local` is gitignored—never commit secrets.

For another machine or deployment, copy the variable names from `.env.example` and retrieve the real values from your private secret source: Vercel/hosting environment variables, Supabase project settings, or a password manager. Do not store real API keys in tracked files.

Location lookups require a signed-in user and a server-side Supabase secret for shared quota checks. Set the optional `GEOAPIFY_API_KEY` (or `LOCATIONIQ_API_KEY`) on the server for each deployment environment. If configured providers are unavailable, search can use Photon and pin address lookup can use Nominatim, neither of which needs a provider key. The map and manual address fields remain usable without an address lookup.

AI enrichment uses `OPENROUTER_API_KEY` on the server after a user submits a workspace. It stores AI suggestions, sources, and failures in `workspace_ai_enrichments` for admin review; it does not publish or overwrite fields automatically. By default it uses a free OpenRouter model that supports structured outputs and first tries web search, then falls back to no-web structured extraction when free server tools fail. Remove stale `OPENROUTER_PLACE_ENRICHMENT_MODEL` overrides in hosting environments unless they point to a current free structured model.

Find a Spot (`/find`) works without AI. To enable the optional OpenRouter interpretation in Preview, see the [Find a Spot rollout plan](docs/FIND_A_SPOT_PLAN.md). It uses the free router and does not use the enrichment model setting.

## Setup
```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm typecheck
pnpm test
```

## Database & Migrations (Supabase)
Key tables/policies: `saved_workspaces`, `visited_workspaces`, `reviews`, `profiles`, `workspaces`, `cities`, `workspace_photos`, `workspace_edit_suggestions`.
Run migrations (Supabase CLI):
```bash
supabase db push
```

The trust/location migration adds moderation metadata, edit suggestions, photo review fields, city cleanup helpers, and RPCs for atomic suggestion reporting and city merges. Run it before testing `/admin/cities`, edit suggestions, admin notes, or photo moderation.

The AI enrichment migration adds `workspace_ai_enrichments`. Run it before expecting submitted workspaces to collect AI-generated descriptions, source links, or reviewer notes.

See [Security and AI rollout](docs/SECURITY_AND_AI_ROLLOUT.md) for the migration order, admin verification, and staging browser test.

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
