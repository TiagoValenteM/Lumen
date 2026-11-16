# Demo Walkthrough

## Start with a decision

Open [Find a Spot in Zürich](https://lumen-lime.vercel.app/find?city=z-rich-schweiz-suisse-svizzera-svizra) and enter `Somewhere quiet for two hours, with Wi-Fi`. Show the filters it selects, then open the map. Enable **Open for my session** and choose a start time. **Matches** cover the full requested session when supported by current venue evidence; **Places to check** identifies what is missing. A scheduled match is not a reservation.

| Desktop search | Mobile session controls | Venue evidence and actions |
| --- | --- | --- |
| [Find a Spot with map](find-a-spot.png) | [Session filters on a phone](session-filters-mobile.png) | [Café du Bonheur detail](workspace-detail.png) and [credited photo](workspace-photo.png) |

These are guest captures from the live app. To recapture, install Chromium with `pnpm exec playwright install chromium` and run `pnpm showcase:capture <future-UTC-session>` from the repository root. Pick a weekday during current Büro Züri and Westhive visitor hours. The script blocks write requests and does not sign in. The map keeps its displayed attribution; see [the venue sources](../product/zurich-cafe-coworking-sources.md) for the café photograph credit.

## Follow one listing through the system

With a staging account, use Add a Place to search for an address and adjust the pin. Submit an example in a city that isn't listed. Switch to the staging moderator: preview the pending place, inspect the facts and photos, and approve it. The public city appears only after that approval. Without staging access, walk through the [submission and approval SQL](../../supabase/migrations/20261112000400_submit_workspace_with_city_proposal.sql) instead of creating a demo listing in production.

## Code worth opening

- [Matching](../../lib/features/find-a-spot/matching.ts) and its [tests](../../tests/find-a-spot.test.mjs): a known negative excludes a place, and unknown evidence cannot satisfy a requirement.
- [AI review transaction](../../supabase/migrations/20261112000200_make_ai_review_atomic.sql): the workspace update and recorded field decisions commit together.
- [Permission tests](../../tests/moderation-security.test.mjs): tests change database roles to check what members, moderators, and the server can do, independent of the UI.

The [pilot notes](../product/find-a-spot.md) describe what to verify and which claims the finder still cannot make.
