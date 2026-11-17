# Location Lead Imports

Lumen can use external place data as discovery leads, but imported locations should stay in an admin-review workflow until a human verifies that the place is genuinely work-friendly.

The tools live in `scripts/location-imports/`. Run the `pnpm locations:*` commands from the repository root. Generated JSON and SQL stay in the local, ignored `data/location-leads/` directory; they are neither fixtures nor migrations. Keep source rights and attribution with any data shared outside your workspace.

## Current Source

The first importer uses OpenStreetMap through the Overpass API:

- Source: OpenStreetMap contributors
- License/attribution: https://www.openstreetmap.org/copyright
- Output: `data/location-leads/us-workspace-leads.json`

These records are not treated as approved Lumen listings. They are candidate leads with source metadata, raw tags, and a conservative `suggested_status` of `pending`.

There is also a tiny LaptopFriendly research importer for small manual-review samples:

- Source: https://laptopfriendly.co
- Output: `data/location-leads/laptopfriendly-us-leads.json`
- Scope: a limited number of public US city/detail pages
- Excluded on purpose: review text, photos, and any attempt to mirror the full directory

## Run

```bash
pnpm locations:leads
```

Useful options:

```bash
pnpm locations:leads --cities new-york,san-francisco,austin
pnpm locations:leads --cities seattle,chicago --limit-per-city 20
pnpm locations:leads --output data/location-leads/us-test.json
```

LaptopFriendly sample:

```bash
pnpm locations:leads:laptopfriendly
pnpm locations:leads:laptopfriendly --cities new-york --limit-per-city 5
```

Build Lumen-shaped import files from the latest lead JSON:

```bash
pnpm locations:import:from-leads
```

This creates:

- `data/location-leads/laptopfriendly-workspace-import.json`
- `data/location-leads/laptopfriendly-workspace-import.sql`

Rows default to `status = pending`. The only other permitted import status is `under_review`. Generated SQL does not replace existing city or workspace rows, and unverified Wi-Fi, outlets, laptop access and stay limits are left unknown.

Enrich imported leads with OpenStreetMap/Nominatim coordinates:

```bash
pnpm locations:import:enrich
```

This creates:

- `data/location-leads/laptopfriendly-workspace-import-enriched.json`
- `data/location-leads/laptopfriendly-workspace-location-fix.sql`

The location fix only targets pending or under-review external leads with missing coordinates. Review the address match before applying it. It cannot update a published place.

Build optional pending photo candidates from open/reusable sources:

```bash
pnpm locations:import:photos
```

This creates:

- `data/location-leads/laptopfriendly-workspace-photo-candidates.sql`

Photo candidates are inserted with `is_approved = false` so they remain in admin moderation until reviewed.

Push the generated import file to Supabase:

```bash
pnpm locations:import:push --dry-run
pnpm locations:import:push --apply --target https://<project-ref>.supabase.co --status pending
```

Dry run is the default. Writes require the exact configured Supabase origin and a server-only `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`. Existing slugs are skipped, not replaced. Review and run against staging first; do not put credentials in client code or commit them.

Supported city keys are currently:

- `new-york`
- `san-francisco`
- `austin`
- `seattle`
- `chicago`

The LaptopFriendly importer currently supports:

- `new-york`

## Rules

- Do not bulk-copy curated directory content from another product into Lumen.
- Keep source attribution and `source_url` with every imported lead.
- Verify address, website, opening hours, laptop friendliness, WiFi, power, and policies before publishing.
- Prefer first-party websites, official venue pages, OpenStreetMap, and user/admin verification for factual fields.
- Imported leads should enter the same moderation path as user-submitted workspaces.
- For LaptopFriendly leads, keep the sample intentionally small and treat their scores/features as clues to verify, not as Lumen-owned truth.
- LaptopFriendly leads do not currently include dependable image URLs in the import. Do not copy LaptopFriendly photos. Use admin uploads or open-source photo candidates that can be reviewed with attribution.
- LaptopFriendly city/detail pages may not expose full coordinates, websites, or phone numbers for every place. Missing fields should stay blank until verified.

## Next Step

The clean product version is an admin import queue: upload this JSON, review each lead, merge duplicates, then promote selected rows into `workspaces` with `status = pending` or `under_review`.
