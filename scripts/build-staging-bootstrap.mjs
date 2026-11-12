import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const migrations = new URL("../supabase/migrations/", import.meta.url);
const read = (name) => readFile(new URL(name, migrations), "utf8");
const beforeHardening = [
  "002_workspace_helpers.sql",
  "003_workspace_count_trigger.sql",
  "007_add_profile_email_tag.sql",
  "008_profiles_rls_policies.sql",
  "20231222_create_visited_workspaces.sql",
  "20241223160000_add_user_badges.sql",
  "20250101_add_has_veg_to_workspaces.sql",
  "20250102_add_has_groups_to_workspaces.sql",
  "20260604_trust_location_moderation.sql",
  "20260605_fix_admin_city_delete.sql",
  "20260606_admin_delete_workspace_and_photos.sql",
  "20260606_fix_workspace_edit_suggestions.sql",
  "20260717_workspace_ai_enrichment.sql",
  "20260731_workspace_ai_review_workflow.sql",
];
const rollout = [
  "20261112000100_lock_down_moderation_permissions.sql",
  "20261112000200_make_ai_review_atomic.sql",
  "20261112000300_limit_geocoding_requests.sql",
  "20261112000400_submit_workspace_with_city_proposal.sql",
  "20261112000500_verify_workspace_work_facts.sql",
  "20261112000600_limit_spot_interpretation.sql",
];

const transactionBody = (sql) => sql.trim().replace(/^BEGIN;\s*/, "").replace(/\s*COMMIT;$/, "");
const section = async (name) => `-- ${name}\n${transactionBody(await read(name))}`;

export async function buildStagingBootstrap() {
  const base = await read("001_create_workspaces_schema.sql");
  const split = base.indexOf("-- Create indexes for performance");
  if (split < 0) throw new Error("The base schema no longer has the expected review-table insertion point.");

  return [
    `-- STAGING ONLY. This creates a fresh Lumen schema without copying production data.
BEGIN;
SET LOCAL search_path TO public, extensions;
DO $$
BEGIN
  IF to_regclass('public.workspaces') IS NOT NULL OR to_regclass('public.profiles') IS NOT NULL
    OR to_regnamespace('lumen_private') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to bootstrap an existing Lumen database.';
  END IF;
END;
$$;`,
    base.slice(0, split),
    await section("004_create_reviews_table.sql"),
    base.slice(split),
    ...await Promise.all(beforeHardening.map(section)),
    // Do not rely on Supabase's project-level default Data API grants.
    `GRANT SELECT ON public.cities, public.workspaces, public.workspace_photos, public.reviews, public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cities, public.workspaces, public.workspace_photos,
  public.reviews, public.profiles, public.saved_workspaces, public.visited_workspaces, public.workspace_edit_suggestions TO authenticated;
GRANT SELECT ON public.saved_workspaces, public.visited_workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_badges TO authenticated;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own badges" ON public.user_badges TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`,
    ...await Promise.all(rollout.map(section)),
    await readFile(new URL("../supabase/staging/storage.sql", import.meta.url), "utf8"),
    "COMMIT;\n",
  ].join("\n\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(await buildStagingBootstrap());
}
