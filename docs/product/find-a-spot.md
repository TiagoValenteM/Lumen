# Find a Spot

## Live behavior and pilot

- `/find` uses approved listings and the existing work-fact checks. Guests can use all manual filters and the local ask box. A positive match requires a check within 180 days, known laptop and stay policies, and positive evidence for any requested amenity or activity. A place with a missing or defaulted activity field belongs in Details to check, not Matches.
- Apply `20261112000500_verify_workspace_work_facts.sql` before the pilot and have reviewers check the selected city's facts. Existing listings are never automatically marked checked. The finder does not make live opening-hours or seating claims.
- To test optional AI in Preview, apply `20261112000600_limit_spot_interpretation.sql`, then set `FIND_A_SPOT_AI_ENABLED=true` with the existing server-only `OPENROUTER_API_KEY` and `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`). AI is off by default, only available to signed-in users, and requires a separate click before sending text. There are four requests per account and 15 total per UTC day; the lower shared cap leaves capacity for moderation. Only counters are stored. AI output is shown for confirmation before updating the controls.
- For the staged pilot, measure whether reviewed listings are sufficient in the chosen city and whether people can find a useful result. Structured hours and date exceptions, post-visit reporting, and aggregate pilot measurement remain follow-ups; don’t advertise a venue as open until that data is dependable.

## 1. Ship the decision flow without AI

**Job:** "Where can I work for two hours, and why would I choose this place?"

- Start in one city with roughly a dozen places whose laptop policy, stay limits, Wi-Fi and outlets have been checked. Don't seed assumed facts or mark existing listings checked.
- Add a Find a Spot entry on the city page and member home. Guests get the same discovery flow; sign-in is only for actions such as saving.
- Reuse the city's filter and map components. Put a compact activity control (Focus, Take a call, General work) and duration control (1, 2, 3 hours) above a shortlist. Provide a city picker and an explicit Near me button; denied geolocation keeps city browsing usable. Use actual distance, not a made-up walking time.
- On mobile, default to the list with a Map toggle; on desktop, synchronize visible results and markers when the map is open. Show why a result matches, one relevant caveat, the check date when available, and a Directions action. Do not claim seating availability or quietness in real time.
- Separate **Matches** from **Details to check**. If there are no matches, offer a concrete relaxation (shorter stay, broader area, or a different activity). Never silently loosen constraints. Keep filter state in the URL; keep exact device location in memory.

## 2. Logic, data and integration

- Define one typed search input: city, activity, duration, optional radius and strict fact requirements. Return workspace IDs, match reasons, caveats, and any unmatched requirements. Keep the matcher pure and shared by the UI and any future assistant.
- Apply hard exclusions before ranking: no laptops, a known stay limit shorter than the session, known failure of an explicitly required amenity, or verified hours that don't cover the session. Unknown facts cannot satisfy hard requirements. Report unverified or incomplete cases separately.
- Rank eligible places by activity fit, evidence recency and distance, with stable tie-breaking. Use the same rules for cards and pins; show a bounded shortlist before offering more. Keep Wi-Fi, power, noise and laptop policy independent: Wi-Fi is not permission to work.
- Extend the admin editor with structured weekly opening windows, date exceptions, venue timezone and source/check date. Model laptop-only restrictions separately from business hours. Add **Open for my session** only when that coverage is dependable, using venue-local time and handling overnight intervals, holiday exceptions and daylight-saving transitions. A listed weekly schedule alone is not proof a venue is open on a special date. [Opening-hours reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#OpeningHours)
- Reuse the existing directions links and moderator queue. In a follow-up, optionally ask visitors for one or two observed facts and let moderators review stale or conflicting reports. Do not replace checked facts automatically.

## 3. Performance and release checks

- Start with existing approved city listings, a narrow projection, and batched fact checks. Compute distance once per candidate per location change. Lazy-load the map, keep shortlist requests cancellable, and avoid per-card database reads.
- If the pilot grows beyond a practical city payload, move candidate selection to a paginated read-only query or RPC and measure it before adding geographic indexes. Do not cache exact coordinates or account-specific results across users.
- Test laptop restrictions, unknown versus false, exact stay boundaries, stale data, missing coordinates, no matches, hours exceptions and deterministic ordering. Browser-test keyboard access, location denial, list/map consistency, and opening directions on mobile and desktop.
- Pilot in staging, then compare time to first useful result, shortlist-to-directions clicks, and no-match rate. Collect aggregate counts without storing raw location or prompts. Check whether users found somewhere workable, not just whether they opened the page.

## 4. Add an optional ask box

Use one inline natural-language field before building a persistent chatbot: "Quiet place for two hours, with Wi-Fi and outlets." Convert it to the same editable filters and use the same matcher. Let the person correct the interpretation. Follow-up chat is only worth building if users routinely need to refine their request.

- Parse clear durations and common intents locally first. For ambiguous requests, call a server-only OpenRouter route with a small typed schema, a short prompt, timeout and strict validation. Use a free model that supports structured outputs, or test `openrouter/free` with the required capabilities. Never fall back to a paid model automatically. [OpenRouter free routing and limits](https://openrouter.ai/collections/free-models)
- Send only what is necessary to interpret the request. No exact GPS, account information, private drafts, or credentials. Don't persist prompt text by default; show a short notice before sending it to a provider. Set per-user and shared quotas, reserve capacity for the existing moderation pipeline, and keep an independent feature flag.
- The model does not choose venue IDs, query arbitrary tools, assert hours, or write listings. Render match reasons from retrieved facts with templates. Bad output, a timeout or a rate limit leaves the normal controls usable. Do not retry in a loop.
- Before enabling the ask box, use a fixture set of actual pilot questions to test wrong-city guesses, missing facts, extra fields, prompt injection, time constraints and provider failures. Ship it only if it gets people to a useful shortlist faster than the controls alone.
