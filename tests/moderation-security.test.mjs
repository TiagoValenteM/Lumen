import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const member = "00000000-0000-0000-0000-000000000001";
const admin = "00000000-0000-0000-0000-000000000002";
const anotherMember = "00000000-0000-0000-0000-000000000003";
const place = "00000000-0000-0000-0000-000000000004";
const otherPlace = "00000000-0000-0000-0000-000000000005";
let db;

const migration = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
const apply = async (name) => db.exec(await migration(name));
const row = async (sql, args) => (await db.query(sql, args)).rows[0];
const denied = (promise, code = "42501") => assert.rejects(promise, (error) => error.code === code);
const enqueue = (workspace, user, rerun = false) => row(
  "SELECT * FROM public.enqueue_workspace_ai_run($1, $2, $3, 'free-test-model', 'full', '{}')",
  [workspace, user, rerun],
);

async function role(name, user = "") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec(`SET ROLE ${name}`);
}

before(async () => {
  db = await PGlite.create({ extensions: { uuid_ossp } });
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS 'SELECT current_user::text';
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  `);

  // The legacy base migration expects reviews before its index/trigger section,
  // but defines that table separately in 004.
  const base = await migration("001_create_workspaces_schema.sql");
  const indexStart = base.indexOf("-- Create indexes for performance");
  assert.ok(indexStart > 0);
  await db.exec(base.slice(0, indexStart));
  await apply("004_create_reviews_table.sql");
  await db.exec(base.slice(indexStart));
  for (const name of [
    "002_workspace_helpers.sql",
    "003_workspace_count_trigger.sql",
    "007_add_profile_email_tag.sql",
    "008_profiles_rls_policies.sql",
    "20250101_add_has_veg_to_workspaces.sql",
    "20250102_add_has_groups_to_workspaces.sql",
    "20260604_trust_location_moderation.sql",
    "20260717_workspace_ai_enrichment.sql",
    "20260731_workspace_ai_review_workflow.sql",
  ]) await apply(name);

  await db.query("INSERT INTO auth.users VALUES ($1), ($2), ($3)", [member, admin, anotherMember]);
  await db.query("INSERT INTO profiles (id, email, is_admin) VALUES ($1, 'private@example.test', false), ($2, NULL, true)", [member, admin]);
  await db.query("INSERT INTO workspaces (id, name, slug, status, admin_notes) VALUES ($1, 'Legacy', 'legacy', 'approved', 'Private legacy note')", [otherPlace]);
  await db.query("INSERT INTO workspace_edit_suggestions (workspace_id, user_id, kind, message, admin_notes) VALUES ($1, $2, 'other', 'Member suggestion', 'Private edit note')", [otherPlace, member]);
  for (const name of [
    "20261112000100_lock_down_moderation_permissions.sql",
    "20261112000200_make_ai_review_atomic.sql",
    "20261112000300_limit_geocoding_requests.sql",
  ]) await apply(name);
});

after(async () => db?.close());

test("normal profile edits work, but members cannot insert or update admin flags", async () => {
  await role("authenticated", member);
  await db.query("UPDATE profiles SET first_name = 'Member' WHERE id = $1", [member]);
  assert.equal((await row("SELECT first_name FROM profiles WHERE id = $1", [member])).first_name, "Member");
  await denied(db.query("UPDATE profiles SET is_admin = true WHERE id = $1", [member]));
  assert.equal((await row("SELECT public.is_admin() AS result")).result, false);

  await role("authenticated", anotherMember);
  await denied(db.query("INSERT INTO profiles (id, is_admin) VALUES ($1, true)", [anotherMember]));
  await db.query("INSERT INTO profiles (id, first_name) VALUES ($1, 'New') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, id = EXCLUDED.id", [anotherMember]);
  await role("authenticated", admin);
  assert.equal((await row("SELECT public.is_admin() AS result")).result, true);
});

test("legacy private values are not returned to the public or to other members", async () => {
  await role("anon");
  assert.equal((await row("SELECT email FROM profiles WHERE id = $1", [member])).email, null);
  assert.equal((await row("SELECT admin_notes FROM workspaces WHERE id = $1", [otherPlace])).admin_notes, null);
  await denied(db.query("SELECT public.get_workspace_admin_notes($1)", [otherPlace]));
  await role("authenticated", member);
  assert.equal((await row("SELECT message FROM workspace_edit_suggestions")).message, "Member suggestion");
  await denied(db.query("SELECT admin_notes FROM workspace_edit_suggestions"));
  assert.equal((await row("SELECT public.get_workspace_admin_notes($1) AS notes", [otherPlace])).notes, null);
  await role("authenticated", admin);
  assert.equal((await row("SELECT public.get_workspace_admin_notes($1) AS notes", [otherPlace])).notes, "Private legacy note");
});

test("submit, enrich once, review, save, preview, and publish under separate roles", async () => {
  await role("authenticated", member);
  await db.query("INSERT INTO workspaces (id, name, slug, submitted_by, latitude, longitude) VALUES ($1, 'Test Cafe', 'test-cafe', $2, 47, 8)", [place, member]);
  await db.query("INSERT INTO workspace_photos (workspace_id, user_id, url, is_approved) VALUES ($1, $2, 'https://example.test/test.jpg', false)", [place, member]);
  await denied(db.query("INSERT INTO workspace_photos (workspace_id, user_id, url, is_approved) VALUES ($1, $2, 'https://example.test/forged.jpg', true)", [place, member]));
  await denied(db.query("INSERT INTO workspace_photos (workspace_id, user_id, url, reviewed_by) VALUES ($1, $2, 'https://example.test/forged.jpg', $2)", [place, member]));
  await denied(db.query("INSERT INTO workspace_photos (workspace_id, user_id, url) VALUES ($1, $2, 'https://example.test/foreign.jpg')", [otherPlace, member]));
  await db.query("UPDATE workspace_photos SET is_approved = true WHERE workspace_id = $1", [place]);
  assert.equal((await row("SELECT is_approved FROM workspace_photos WHERE workspace_id = $1", [place])).is_approved, false);
  await denied(db.query("INSERT INTO workspace_ai_enrichments (workspace_id, requested_by, status, model) VALUES ($1, $2, 'ready_for_review', 'fake')", [place, member]));
  await denied(enqueue(place, member));

  await role("anon");
  assert.equal(await row("SELECT id FROM workspaces WHERE id = $1", [place]), undefined);

  await role("service_role");
  await denied(enqueue(place, anotherMember));
  const run = await enqueue(place, member);
  assert.equal(run.started, true);
  assert.deepEqual(await enqueue(place, admin, true), { ...run, started: false });
  await denied(db.query("INSERT INTO workspace_ai_enrichments (workspace_id, status, model) VALUES ($1, 'researching', 'duplicate')", [place]), "23505");
  await db.query("UPDATE workspace_ai_enrichments SET status = 'ready_for_review', suggested_fields = $2 WHERE id = $1", [
    run.run_id,
    JSON.stringify({ description: "Good for long work sessions.", website: "https://example.test", work_details: { has_wifi: false }, work_notes: ["Bring a charger."] }),
  ]);
  assert.deepEqual(await enqueue(place, member), { ...run, run_status: "ready_for_review", started: false });

  await role("authenticated", member);
  assert.equal(await row("SELECT id FROM workspace_ai_enrichments WHERE id = $1", [run.run_id]), undefined);
  await denied(db.query("UPDATE workspace_ai_enrichments SET status = 'applied' WHERE id = $1", [run.run_id]));
  await denied(db.query("SELECT public.save_workspace_ai_review($1, $2, '{}', ARRAY['description'])", [place, run.run_id]));

  await role("authenticated", admin);
  await denied(db.query("UPDATE workspace_ai_enrichments SET status = 'applied' WHERE id = $1", [run.run_id]));
  await db.query("SELECT public.review_workspace_ai_run($1, $2, '{\"website\":\"rejected\"}', false)", [place, run.run_id]);
  const save = (patch, paths) => db.query("SELECT public.save_workspace_ai_review($1, $2, $3, $4)", [place, run.run_id, JSON.stringify(patch), paths]);
  await denied(save({ name: null }, ["description"]), "23502");
  await denied(save({ description: "Wrong" }, ["website"]), "22023");
  assert.deepEqual(await row("SELECT status, field_decisions FROM workspace_ai_enrichments WHERE id = $1", [run.run_id]),
    { status: "ready_for_review", field_decisions: { website: "rejected" } });
  assert.equal((await row("SELECT description FROM workspaces WHERE id = $1", [place])).description, null);

  await save({ description: "Good for long work sessions.", has_wifi: false, admin_notes: "Bring a charger." }, ["description", "work_details.has_wifi", "work_notes.0"]);
  assert.equal((await row("SELECT description FROM workspaces WHERE id = $1", [place])).description, "Good for long work sessions.");
  assert.equal((await row("SELECT public.get_workspace_admin_notes($1) AS notes", [place])).notes, "Bring a charger.");
  assert.deepEqual(await row("SELECT status, field_decisions FROM workspace_ai_enrichments WHERE id = $1", [run.run_id]), {
    status: "applied",
    field_decisions: { website: "rejected", description: "applied", "work_details.has_wifi": "applied", "work_notes.0": "applied" },
  });
  await role("anon");
  assert.equal(await row("SELECT id FROM workspaces WHERE id = $1", [place]), undefined);
  await role("authenticated", admin);
  await db.query("UPDATE workspaces SET status = 'approved' WHERE id = $1", [place]);
  await role("anon");
  assert.deepEqual(await row("SELECT status, description, admin_notes FROM workspaces WHERE id = $1", [place]), {
    status: "approved", description: "Good for long work sessions.", admin_notes: null,
  });
});

test("stale AI runs can be recovered without unlocking a fresh run", async () => {
  await role("service_role");
  const run = await enqueue(otherPlace, admin, true);
  await db.query("SELECT public.expire_workspace_ai_runs($1)", [otherPlace]);
  assert.equal((await enqueue(otherPlace, admin, true)).run_id, run.run_id);
  await role("postgres");
  await db.exec("ALTER TABLE public.workspace_ai_enrichments DISABLE TRIGGER update_workspace_ai_enrichments_updated_at");
  await db.query("UPDATE workspace_ai_enrichments SET updated_at = now() - interval '4 minutes' WHERE id = $1", [run.run_id]);
  await db.exec("ALTER TABLE public.workspace_ai_enrichments ENABLE TRIGGER update_workspace_ai_enrichments_updated_at");
  await role("service_role");
  const retry = await enqueue(otherPlace, admin, true);
  assert.notEqual(retry.run_id, run.run_id);
  assert.equal((await row("SELECT status FROM workspace_ai_enrichments WHERE id = $1", [run.run_id])).status, "failed");
});

test("geocoding quota is server-only, per member, and shared across provider requests", async () => {
  const take = (user, provider) => row("SELECT public.take_geocoding_slot($1, $2) AS retry", [user, provider]);
  await role("authenticated", member);
  await denied(take(member, "geoapify"));
  await role("service_role");
  await db.transaction(async (transaction) => {
    for (let i = 0; i < 30; i++) {
      const result = await transaction.query("SELECT public.take_geocoding_slot($1, 'geoapify') AS retry", [member]);
      assert.equal(result.rows[0].retry, 0);
    }
    const result = await transaction.query("SELECT public.take_geocoding_slot($1, 'locationiq') AS retry", [member]);
    assert.equal(result.rows[0].retry, 60);
  });
  assert.equal((await take(admin, "nominatim")).retry, 0);
  assert.equal((await take(anotherMember, "nominatim")).retry, 1);
});
