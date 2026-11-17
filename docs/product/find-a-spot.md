# Find a Spot

## Live behavior and pilot

- `/find` uses approved listings and the existing work-fact checks. Guests can use all manual filters and the local ask box. Normally a match requires a work-fact check within 180 days, known laptop and stay policies, and positive evidence for requested amenities or activities. With the session filter on, independently verified session evidence can establish laptop access and a known stay limit, but it never verifies unrelated amenities or activities.
- Reviewers check the selected city's facts before treating them as verified. Existing listings are never automatically marked checked. Session results use published venue evidence, not a real-time feed; a match does not guarantee a seat.
- To test optional AI in Preview, apply `20261112000600_limit_spot_interpretation.sql`, then set `FIND_A_SPOT_AI_ENABLED=true` with the existing server-only `OPENROUTER_API_KEY` and `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`). AI is off by default, only available to signed-in users, and requires a separate click before sending text. There are four requests per account and 15 total per UTC day; the lower shared cap leaves capacity for moderation. Only counters are stored. AI output is shown for confirmation before updating the controls.
- Structured hours and date exceptions are live for selected venues. Signed-in visitors can report a recent visit from a place page. The private **Session review** queue prioritizes possible closures, visit reports, and stale evidence. Reports never edit public facts automatically. Aggregate pilot measurement is still a follow-up.

## Session hours

**Open for my session** uses the selected duration and either the current time or a scheduled start. Scheduled links store a UTC minute; the input shows browser-local time and the evaluator uses each venue's timezone. When evidence is missing, the place stays in **Places to check**. A confirmed conflict removes it from both the shortlist and map.

Moderators manage evidence from **Admin → Workspaces → place → Session hours → Edit hours**. **Save hours draft** does not change the public result. **Verify and publish hours** requires an approved place with a saved location, both policy sources and date coverage, and the moderator's confirmation. **Withdraw verification** hides the public evidence and preserves the draft. Changes to the place identity, map pin, approval status or generic laptop/stay facts also withdraw verification. Reload a stale editor before saving.

- Record the venue's named timezone and two independent schedules: public opening hours and laptop access. Keep a source, verification timestamp and the last local date through which exceptions were checked for each. An unknown day is omitted; an explicitly closed or restricted day uses an empty set of allowed windows.
- Use half-open windows in local minutes (0 to 1440). Split overnight windows at midnight, and let each local date's exceptions replace its weekly windows. Check the full elapsed session, including daylight-saving transitions and any break between windows. The evaluator treats checks older than 30 days or dates outside the exception coverage as unknown.
- Source records must cover the same venue and the right area or room. Use the date exception fields for holidays, private closures and changes; the date overrides the weekly schedule. Do not extrapolate holiday hours or use free-text AI notes as evidence. For a fresh verification, the coverage end can be up to 60 days ahead, but the review itself expires after 30 days.
- The initial Fiction Bar/Cafe pilot retains its original check timestamp and November 22, 2026 cutoff. Its [official policy](https://fictionbk.com/about) establishes regular hours, laptop access, a two-hour stay limit and two-drink minimum. Coverage does not extend to Thanksgiving.
- Reviewed November 16, 2026: [Passionfruit Coffee](https://www.passionfruitcoffee.com/contact) and [City League Coffee Roasters](https://cityleaguecoffee.com/contact/) publish regular hours for the exact listings. [City League's shop page](https://cityleaguecoffee.com/bay-ridge-coffee-shop/) explicitly welcomes work and advertises outlets and Wi-Fi, but does not establish holiday exceptions or a stay limit. The [NYPL Dorot room guide](https://libguides.nypl.org/dorot/planningavisit) confirms personal-device access for quiet study in room 111, not building-wide; exact coverage is missing. These three records are private drafts only. [Olympia Coffee Downtown Seattle](https://www.olympiacoffee.com/pages/downtown-seattle) lists a different address than Lumen's Seattle entry; do not attach those hours to the existing listing.

## Design Notes

The following sections document the original rollout criteria and future options; the sections above describe current behavior.

### 1. Ship the decision flow without AI

**Job:** "Where can I work for two hours, and why would I choose this place?"

- Start in one city with roughly a dozen places whose laptop policy, stay limits, Wi-Fi and outlets have been checked. Don't seed assumed facts or mark existing listings checked.
- Add a Find a Spot entry on the city page and member home. Guests get the same discovery flow; sign-in is only for actions such as saving.
- Reuse the city's filter and map components. Put a compact activity control (Focus, Take a call, General work) and duration control (1, 2, 3 hours) above a shortlist. Provide a city picker and an explicit Near me button; denied geolocation keeps city browsing usable. Use actual distance, not a made-up walking time.
- On mobile, default to the list with a Map toggle; on desktop, synchronize visible results and markers when the map is open. Show why a result matches, one relevant caveat, the check date when available, and a Directions action. Do not claim seating availability or quietness in real time.
- Separate **Matches** from **Places to check**. When nothing is confirmed, show the places with missing or unverified facts first, followed by an optional filter relaxation. Never silently loosen constraints. Keep the active filters visible in a compact summary; the filter controls and map open on demand. Keep filter state in the URL and exact device location in memory.

### 2. Logic, data and integration

- Define one typed search input: city, activity, duration, optional radius and strict fact requirements. Return workspace IDs, match reasons, caveats, and any unmatched requirements. Keep the matcher pure and shared by the UI and any future assistant.
- Apply hard exclusions before ranking: no laptops, a known stay limit shorter than the session, known failure of an explicitly required amenity, or verified hours that don't cover the session. Unknown facts cannot satisfy hard requirements. Report unverified or incomplete cases separately.
- Rank eligible places by activity fit, evidence recency and distance, with stable tie-breaking. Use the same rules for cards and pins; show a bounded shortlist before offering more. Keep Wi-Fi, power, noise and laptop policy independent: Wi-Fi is not permission to work.
- Extend the admin editor with structured weekly opening windows, date exceptions, venue timezone and source/check date. Model laptop-only restrictions separately from business hours. Add **Open for my session** only when that coverage is dependable, using venue-local time and handling overnight intervals, holiday exceptions and daylight-saving transitions. A listed weekly schedule alone is not proof a venue is open on a special date. [Opening-hours reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#OpeningHours)
- Reuse the existing directions links and moderator queue. In a follow-up, optionally ask visitors for one or two observed facts and let moderators review stale or conflicting reports. Do not replace checked facts automatically.

### 3. Performance and release checks

- Start with existing approved city listings, a narrow projection, and batched fact checks. Compute distance once per candidate per location change. Lazy-load the map, keep shortlist requests cancellable, and avoid per-card database reads.
- If the pilot grows beyond a practical city payload, move candidate selection to a paginated read-only query or RPC and measure it before adding geographic indexes. Do not cache exact coordinates or account-specific results across users.
- Test laptop restrictions, unknown versus false, exact stay boundaries, stale data, missing coordinates, no matches, hours exceptions and deterministic ordering. Browser-test keyboard access, location denial, list/map consistency, and opening directions on mobile and desktop.
- Pilot in staging, then compare time to first useful result, shortlist-to-directions clicks, and no-match rate. Collect aggregate counts without storing raw location or prompts. Check whether users found somewhere workable, not just whether they opened the page.

### 4. Add an optional ask box

Use one inline natural-language field before building a persistent chatbot: "Quiet place for two hours, with Wi-Fi and outlets." Convert it to the same editable filters and use the same matcher. Let the person correct the interpretation. Follow-up chat is only worth building if users routinely need to refine their request.

- Parse clear durations and common intents locally first. For ambiguous requests, call a server-only OpenRouter route with a small typed schema, a short prompt, timeout and strict validation. Use a free model that supports structured outputs, or test `openrouter/free` with the required capabilities. Never fall back to a paid model automatically. [OpenRouter free routing and limits](https://openrouter.ai/collections/free-models)
- Send only what is necessary to interpret the request. No exact GPS, account information, private drafts, or credentials. Don't persist prompt text by default; show a short notice before sending it to a provider. Set per-user and shared quotas, reserve capacity for the existing moderation pipeline, and keep an independent feature flag.
- The model does not choose venue IDs, query arbitrary tools, assert hours, or write listings. Render match reasons from retrieved facts with templates. Bad output, a timeout or a rate limit leaves the normal controls usable. Do not retry in a loop.
- Before enabling the ask box, use a fixture set of actual pilot questions to test wrong-city guesses, missing facts, extra fields, prompt injection, time constraints and provider failures. Ship it only if it gets people to a useful shortlist faster than the controls alone.
