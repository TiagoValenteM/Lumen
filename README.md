# Lumen

Find a café, library, or coworking desk that fits the work you need to do. Lumen helps you plan around laptop rules, verified opening hours, Wi-Fi, outlets, and stay limits. It shows what still needs a check instead of treating missing data as a match.

[Live demo](https://lumen-lime.vercel.app/find?city=z-rich-schweiz-suisse-svizzera-svizra) · [Product walkthrough](docs/showcase/walkthrough.md) · [Architecture](docs/engineering/architecture.md) · [Checks](https://github.com/TiagoValenteM/Lumen/actions/workflows/checks.yml)

![Find a Spot showing verified coworking options and a map of Zurich](docs/showcase/find-a-spot.png)

## Try the app

1. Open [Find a Spot in Zürich](https://lumen-lime.vercel.app/find?city=z-rich-schweiz-suisse-svizzera-svizra). Enter `Somewhere quiet for two hours, with Wi-Fi` or set those filters directly.
2. Turn on **Open for my session** and pick a start time. **Matches** fit the selected filters; **Places to check** explains missing or out-of-date evidence. A match does not guarantee an available seat.
3. Open the map or a [place detail](https://lumen-lime.vercel.app/cities/z-rich-schweiz-suisse-svizzera-svizra/cafe-du-bonheur-zurich). Browse without signing in, or sign in to save, review, report a visit, or submit a place.

See the [mobile filters](docs/showcase/session-filters-mobile.png) and [place detail](docs/showcase/workspace-detail.png). These are captures of the public app, not design mockups.

## What the code demonstrates

| Decision | Implementation |
| --- | --- |
| **Uncertainty is part of the result.** | The [matching engine](lib/features/find-a-spot/matching.ts) distinguishes missing, negative, and stale facts. [Session checks](lib/features/find-a-spot/session-availability.ts) evaluate the full visit in the venue's timezone, including holidays and overnight windows. |
| **A place is private until approved.** | The [submission transaction](supabase/migrations/20261112000400_submit_workspace_with_city_proposal.sql) writes a listing and photo records together. The first submission can propose a city without exposing it publicly. |
| **AI proposes; reviewers publish.** | Optional AI research suggests field edits. The [review transaction](supabase/migrations/20261112000200_make_ai_review_atomic.sql) records approved edits alongside the saved changes. Visit reports and expiring evidence enter a [private review queue](supabase/migrations/20261116000200_review_workspace_session_evidence.sql). |

**Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/Storage, MapLibre, and Vercel.

## Develop and verify

Use Node.js 24 and pnpm 10. Code and PostgreSQL tests do not need Supabase credentials:

```sh
pnpm install --frozen-lockfile
pnpm test
```

- [Local setup and browser tests](docs/engineering/development.md)
- [Documentation index](docs/index.md) and [deployment runbook](docs/operations/deployments.md)
- [Contributing](CONTRIBUTING.md) and [private security reporting](SECURITY.md)

Built by [Tiago Valente](https://github.com/TiagoValenteM). Proudly developed in Switzerland.
