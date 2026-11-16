# Supabase

| Path | Purpose |
| --- | --- |
| [migrations/](migrations/) | Versioned schema, policies, and database functions. Keep applied migrations immutable. |
| [checks/](checks/) | Read-only operator diagnostics. Use these to inspect the target, not change it. |
| [data-patches/](data-patches/) | Historical, reviewed data publications. These write data and are not bootstrap inputs or routine release steps. Each dated patch has limited verification coverage. Do not replay it to refresh stale evidence. |
| [staging/](staging/) | Isolated environment setup used by the [bootstrap script](../scripts/build-staging-bootstrap.mjs). |
| [seed_data.sql](seed_data.sql) | Illustrative local development data; never use on production. |

Read the [deployment runbook](../docs/operations/deployments.md) before changing a hosted database. The [location imports guide](../docs/operations/location-imports.md) covers candidate data that must remain private until review.
