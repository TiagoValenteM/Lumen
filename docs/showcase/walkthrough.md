# Deskhaunt Interview Walkthrough

The decision to focus on: **Can I work from this place for two hours with Wi-Fi?** Explain how Deskhaunt answers that without turning missing data into a recommendation.

## Start with a decision

Open [Find a Spot in New York](https://lumen-lime.vercel.app/find?city=new-york-united-states) and enter `Somewhere quiet for two hours, with Wi-Fi`. Show the filters it selects, then open the map. Point out a result under **Details to check** and explain what information would move it into **Matches**. There may be no confirmed matches for that request; the app does not relax the filters or claim a place is open.

## Follow one listing through the system

With a staging account, use Add a Place to search for an address and adjust the pin. Submit an example in a city that isn't listed. Switch to the staging moderator: preview the pending place, inspect the facts and photos, and approve it. The public city appears only after that approval. Without staging access, walk through the [submission and approval SQL](../../supabase/migrations/20261112000400_submit_workspace_with_city_proposal.sql) instead of creating a demo listing in production.

The [AI review capture](ai-review.png) uses sample data. Show the current and proposed values side by side. **Apply** stages the selected fields in the form; **Save changes** persists them. The saved preview is still private unless the place is already approved.

## Screens To Have Ready

| Capture | What to point out |
| --- | --- |
| [Find a Spot](find-a-spot.png) | One request becomes editable filters. The list and map come from the same results. |
| [Mobile home](home-mobile.png) | Public discovery starts without sign-in. |
| [Mobile place details](place-mobile.png) | The page separates known work facts from verification and puts directions near the address. |
| [AI review](ai-review.png) | The moderator compares and saves suggestions without automatically publishing the listing. |

## Code worth opening

- [Matching](../../lib/features/find-a-spot/matching.ts) and its [tests](../../tests/find-a-spot.test.mjs): a known negative excludes a place, and unknown evidence cannot satisfy a requirement.
- [AI review transaction](../../supabase/migrations/20261112000200_make_ai_review_atomic.sql): the workspace update and recorded field decisions commit together.
- [Permission tests](../../tests/moderation-security.test.mjs): tests change database roles to check what members, moderators, and the server can do, independent of the UI.

The next product milestone is a city with enough checked listings for a reliable shortlist. The [pilot notes](../product/find-a-spot.md) describe what to verify and which claims the finder still cannot make.

## Refresh The Captures

With the app running locally and Chromium and WebKit installed for Playwright, run `LUMEN_E2E_BASE_URL=http://127.0.0.1:3000 node scripts/branding/capture-showcase.mjs` for the three public shots. The [admin browser test](../../tests/e2e/admin-identity.spec.ts) captures the ready-for-review editor on desktop using fake authentication, place, and AI responses. Use its `editor-1440.png` output for the AI review capture. Never capture private production moderation data.

Regenerate the app icons and share image from the unchanged brand PNG with `node scripts/branding/render-assets.mjs`.
