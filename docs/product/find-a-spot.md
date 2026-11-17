# Find a Spot

## Discovery

`/find` loads approved places for the selected city. Manual controls and the local natural-language parser set the same typed URL filters: activity, duration, radius, and required work facts. Exact device location stays in browser memory; denied location permission does not prevent city browsing.

The matcher separates **Matches** from **Places to check**. Unknown facts never satisfy a required condition. A known laptop restriction, a stay limit shorter than the session, or a failed required amenity excludes the place. Ordering is deterministic and uses work suitability, evidence recency, and distance when available. Filters are never relaxed silently.

Normally a match needs a work-fact check within 180 days, known laptop and stay policies, and positive evidence for requested amenities or activities. Independently verified session evidence can establish laptop access and a stay limit for that session, but cannot verify unrelated amenities. A match does not guarantee a seat or real-time quietness.

On mobile the list appears first; filters and the map open on demand. Active preferences stay visible. The map uses the same candidate results as the list and loads only when opened. Directions links use the venue's coordinates, not the visitor's location.

## Session hours

**Open for my session** evaluates the selected duration from either now or a scheduled start. Shared links store a UTC minute; the input shows browser-local time and evaluation uses the venue's timezone. Missing evidence keeps a place in **Places to check**. A confirmed conflict removes it from the shortlist and map.

Moderators manage evidence from **Admin → Workspaces → place → Session hours → Edit hours**. Saving a draft does not change public results. Publishing requires an approved place with a saved location, sources for opening hours and laptop access, exception coverage, and moderator confirmation. Withdrawal hides public evidence while preserving the draft. Changes to the place identity, pin, approval status, or laptop/stay facts also withdraw verification. A stale editor must reload before saving.

- Public opening hours and laptop access have independent schedules, sources, verification times, and exception coverage dates.
- Unknown days are omitted. An explicitly closed or restricted day has no allowed windows. Date exceptions replace the weekly schedule for that local date.
- Windows are half-open local minute intervals from 0 to 1440; overnight windows split at midnight. The whole elapsed session must fit, including daylight-saving transitions and breaks.
- Evidence older than 30 days or outside its exception coverage is unknown. New verification can cover up to 60 days ahead, but still expires after 30 days.
- Sources must match the exact venue and area or room. Do not extrapolate holiday hours, turn AI notes into verified facts, or infer laptop permission from Wi-Fi.

Signed-in visitors can report a recent visit from a place page. The private **Session review** queue prioritizes possible closures, visit reports, and stale evidence. Reports never update public facts automatically.

## Optional AI interpretation

The local parser works for guests and requires no provider. Server-side interpretation is off by default behind `FIND_A_SPOT_AI_ENABLED`; enabling it also requires the quota migration and server-only credentials described in [local development](../engineering/development.md) and the [deployment runbook](../operations/deployments.md).

AI interpretation requires sign-in and a separate click before sending text. Quotas allow four requests per account and 15 total per UTC day. Only counters are stored. A bounded, free-only provider call returns validated filters for the user to confirm; it does not choose venue IDs, assert facts, query arbitrary tools, or publish listings. Exact GPS, private drafts, and credentials are not sent. Invalid output, timeouts, and rate limits leave manual controls usable.

## Evidence And Verification

Source records and their limits are documented in [library evidence](verified-library-pilot.md) and [Zurich café and coworking evidence](zurich-cafe-coworking-sources.md). Date-specific research is not proof beyond the saved coverage or verification expiry; review the current admin record before publishing.

Unit and PostgreSQL integration tests cover unknown versus false, strict stay boundaries, stale evidence, missing coordinates, overnight hours, exceptions, daylight-saving changes, permission boundaries, and deterministic matching. Isolated browser tests cover mobile filters, list/map behavior, sign-in return paths, and moderator-managed hours reaching guest results. See [test commands and environment boundaries](../engineering/development.md#checks).
