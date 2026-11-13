# Data Model

The [Supabase migrations](../../supabase/migrations) define the schema and permissions. The [TypeScript domain types](../../lib/types) describe the data the app consumes; they are not a substitute for checking a migration.

| Data | Role |
| --- | --- |
| `cities`, `workspaces` | Cities group published places. A first-place submission carries a city proposal; approval links it to an existing city or creates the city in the same transaction. |
| `workspace_photos`, `reviews` | Photos are moderated separately from places. Reviews store user ratings and comments; the app calculates its workability display from place facts. |
| `profiles`, `saved_workspaces`, `visited_workspaces` | Public profile fields are separate from Auth email. Saved and visited places belong to the account that created them. |
| `workspace_edit_suggestions` | Members can report corrections. Moderator notes are not part of the public or member-facing result. |
| `workspace_ai_enrichments` | Server-side research runs, proposed fields, evidence, and reviewer decisions. Saving an accepted patch and recording the decisions happen together. |
| `workspace_work_fact_checks` | Stores when a moderator checked the work facts. Public reads can see the date for published places but not who checked it. Changes to covered facts invalidate the check. |
| `lumen_private.*` | Moderator roles, internal place notes, and quota counters. Client roles have no direct access to the schema. |

## State and access

New places start `pending`. Moderators may request fixes (`under_review`), reject, or approve. A member can see their own submission; the public directory only shows approved places. Database policies enforce the roles even if a client bypasses the UI. See [the deployment runbook](../operations/deployments.md) for the audit and migration sequence.

The finder treats `false`, unknown, and stale evidence differently. A verified no can rule out a result; a missing or expired check cannot satisfy a requirement. See [Find a Spot](../product/find-a-spot.md) for the matching rules and limits.

## Photo storage

The `workspace-photos` and `avatars` buckets use public object URLs. Public access to a file URL is not the same as approval for display in the directory. Storage policies restrict uploads to the account's folder and allow moderation of workspace photos. The app attaches one to five photos when a place is submitted. The database transaction covers the place and its photo records; the file uploads happen before that transaction.
