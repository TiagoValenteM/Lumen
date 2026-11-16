import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { createSessionAssessment } from "../lib/features/find-a-spot/session-availability.ts";

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
    "20261112000400_submit_workspace_with_city_proposal.sql",
    "20261112000500_verify_workspace_work_facts.sql",
    "20261116000100_manage_workspace_session_hours.sql",
    "20261116000200_review_workspace_session_evidence.sql",
  ]) await apply(name);
});

after(async () => db?.close());

const uploadedPhoto = (owner, file = "test.jpg") =>
  `https://test.supabase.co/storage/v1/object/public/workspace-photos/${owner}/temp/${file}`;
const newPlace = (id, city, photos, details = {}) => row(
  "SELECT public.submit_workspace_with_photos($1, $2, 'Switzerland', $3, $4) AS id",
  [id, city, JSON.stringify({ name: "First place", latitude: 47, longitude: 8, ...details }), photos],
);

test("only moderators can publish venue hours; drafts, withdrawn and stale evidence never leak", async () => {
  const id = randomUUID();
  const name = "Session Hours Cafe";
  await role("authenticated", member);
  await newPlace(id, "Hours Test City", [uploadedPhoto(member)], { name, address: "1 Test Street" });
  await role("authenticated", admin);
  const update = (revision, snapshot, action, payload) => row(
    "SELECT public.update_workspace_session_hours($1,$2,$3,$4,$5) AS result", [id, revision, snapshot, action, payload]);
  const read = () => row("SELECT public.read_workspace_session_hours($1) AS result", [id]);
  const publicRows = () => row("SELECT count(workspace_id)::int AS count FROM public.workspace_session_hours WHERE workspace_id = $1", [id]);
  const { date } = await row("SELECT ((now() AT TIME ZONE 'UTC')::date + 7)::text AS date");
  const policy = { source: "https://example.org/hours", coverageSource: "https://example.org/holidays",
    exceptionsCheckedThrough: date, weekly: { Mon: [[480, 1080]] }, exceptions: { [date]: [] } };
  const payload = { timeZone: "UTC", opening: policy, laptopAccess: { ...policy, maxSessionMinutes: 90 }, note: "Verified note" };
  const snapshot = async () => row("SELECT name,address,city_id AS \"cityId\",latitude::float,longitude::float FROM workspaces WHERE id=$1", [id]);
  const pendingSnapshot = await snapshot();
  const first = (await update(null, pendingSnapshot, "draft", payload)).result;
  assert.equal(first.revision, 1);
  await denied(update(1, pendingSnapshot, "verify", payload), "22023");
  await role("anon");
  assert.equal((await publicRows()).count, 0);
  await denied(read());
  await role("authenticated", member);
  await denied(read());
  await denied(update(1, pendingSnapshot, "verify", payload));
  await denied(db.query("UPDATE public.workspace_session_hours SET published='{}' WHERE workspace_id=$1", [id]));

  await role("authenticated", admin);
  await db.query("UPDATE workspaces SET status='approved' WHERE id=$1", [id]);
  const saved = await snapshot();
  assert.equal((await read()).result.revision, 2);
  await denied(update(1, saved, "verify", payload), "40001");
  await denied(update(2, { ...saved, address: "Wrong venue" }, "verify", payload), "40001");
  for (const invalid of [
    { ...payload, timeZone: "+02:00" },
    { ...payload, opening: { ...policy, source: "javascript:alert(1)" } },
    { ...payload, opening: { ...policy, exceptionsCheckedThrough: "2026-02-31" } },
    { ...payload, opening: { ...policy, exceptions: { "2026-02-31": [] } } },
    { ...payload, opening: { ...policy, weekly: { Mon: [[600, 650], [620, 700]] } } },
    { ...payload, opening: { ...policy, weekly: { Mon: {} } } },
    { ...payload, laptopAccess: { ...policy, maxSessionMinutes: 1.5 } },
  ]) await denied(update(2, saved, "verify", invalid), "22023");

  assert.equal((await update(2, saved, "verify", payload)).result.revision, 3);
  const draft = { ...payload, note: "Draft only" };
  const updated = (await update(3, saved, "draft", draft)).result;
  assert.equal(updated.published.note, "Verified note");
  assert.equal(updated.draft.note, "Draft only");
  await role("anon");
  assert.equal((await publicRows()).count, 1);
  assert.equal((await row("SELECT published->>'note' AS note FROM public.workspace_session_hours WHERE workspace_id=$1", [id])).note, "Verified note");
  await denied(db.query("SELECT draft,checked_by FROM public.workspace_session_hours WHERE workspace_id=$1", [id]));
  await role("authenticated", admin);
  assert.equal((await update(4, saved, "withdraw", null)).result.published, null);
  assert.equal((await update(5, saved, "verify", draft)).result.revision, 6);
  await db.query("UPDATE workspaces SET latitude=46 WHERE id=$1", [id]);
  assert.equal((await read()).result.published, null);
  const changed = await snapshot();
  assert.equal((await update(7, changed, "verify", draft)).result.revision, 8);
  await role("postgres");
  await db.query("UPDATE public.workspace_session_hours SET checked_at=now()-interval '31 days' WHERE workspace_id=$1", [id]);
  await role("anon");
  assert.equal((await publicRows()).count, 0);
});

test("work fact checks require a moderator and saved facts, and expire when the facts change", async () => {
  const id = randomUUID();
  const snapshot = {
    name: "First place", city_id: null, address: null, latitude: 47, longitude: 8,
    has_wifi: null, has_power_outlets: null, laptop_friendly: null, time_limit_hours: null,
  };
  const check = (value) => row("SELECT check_workspace_work_facts($1, $2) AS checked_at", [id, JSON.stringify(value)]);
  await role("authenticated", member);
  await newPlace(id, "Work Fact Test City", [uploadedPhoto(member)]);
  assert.deepEqual(await row("SELECT has_wifi, has_power_outlets, laptop_friendly, time_limit_hours FROM workspaces WHERE id = $1", [id]), {
    has_wifi: null, has_power_outlets: null, laptop_friendly: null, time_limit_hours: null,
  });
  await denied(check(snapshot));
  await denied(db.query("INSERT INTO workspace_work_fact_checks (workspace_id) VALUES ($1)", [id]));

  await role("authenticated", admin);
  await denied(check(snapshot), "22023");
  const published = await row("UPDATE workspaces SET status = 'approved' WHERE id = $1 RETURNING city_id", [id]);
  snapshot.city_id = published.city_id;
  await denied(check(snapshot), "22023");
  await db.query("UPDATE workspaces SET laptop_friendly = true, has_wifi = false, time_limit_hours = 0 WHERE id = $1", [id]);
  await denied(check(snapshot), "22023");
  Object.assign(snapshot, { laptop_friendly: true, has_wifi: false, time_limit_hours: 0 });
  const { checked_at } = await check(snapshot);
  assert.ok(checked_at);
  await db.query("UPDATE workspaces SET description = 'Updated copy' WHERE id = $1", [id]);

  await role("anon");
  assert.deepEqual(await row("SELECT checked_at FROM workspace_work_fact_checks WHERE workspace_id = $1", [id]), { checked_at });
  await denied(db.query("SELECT checked_by FROM workspace_work_fact_checks WHERE workspace_id = $1", [id]));
  await role("authenticated", admin);
  await db.query("UPDATE workspaces SET has_wifi = true WHERE id = $1", [id]);
  await role("anon");
  assert.equal(await row("SELECT checked_at FROM workspace_work_fact_checks WHERE workspace_id = $1", [id]), undefined);
});

test("Swiss label correction keeps existing city links and new submissions match the same city", async () => {
  await role("postgres");
  const legacyName = "Schweiz/Suisse/Svizzera/Svizra";
  const slug = "z-rich-schweiz-suisse-svizzera-svizra";
  const city = await row("INSERT INTO cities (name, slug, country) VALUES ('Zürich', $1, $2) RETURNING id", [slug, legacyName]);
  const draft = randomUUID();
  await db.query("INSERT INTO workspaces (id, name, slug, status, proposed_city_name, proposed_city_country) VALUES ($1, 'Swiss draft', 'swiss-draft', 'pending', 'Bern', $2)", [draft, legacyName]);
  await apply("20261113000100_normalize_swiss_city_country.sql");
  assert.deepEqual(await row("SELECT id, slug, country, country_code FROM cities WHERE slug = $1", [slug]), {
    id: city.id, slug, country: "Switzerland", country_code: "CH",
  });
  assert.equal((await row("SELECT proposed_city_country FROM workspaces WHERE id = $1", [draft])).proposed_city_country, "Switzerland");

  await role("authenticated", member);
  const id = randomUUID();
  await newPlace(id, "Zürich", [uploadedPhoto(member)]);
  assert.deepEqual(await row("SELECT city_id, proposed_city_country FROM workspaces WHERE id = $1", [id]), {
    city_id: city.id, proposed_city_country: null,
  });
});

test("a member can propose a city, retry without duplicates, and publish only after moderation", async () => {
  const first = randomUUID();
  const second = randomUUID();
  const third = randomUUID();
  const cityName = "First Place City";
  const urls = [uploadedPhoto(member), uploadedPhoto(member, "other.jpg")];
  await role("anon");
  await denied(newPlace(first, cityName, urls));
  await role("authenticated", member);
  await denied(db.query("INSERT INTO cities (name, country, slug) VALUES ($1, 'Switzerland', 'unmoderated')", [cityName]));
  await denied(newPlace(first, cityName, [uploadedPhoto(anotherMember)]), "22023");
  await denied(newPlace(first, cityName, urls, { status: "approved" }), "22023");
  assert.deepEqual(await newPlace(first, cityName, urls), { id: first });
  assert.deepEqual(await newPlace(first, cityName, urls), { id: first });
  assert.deepEqual(await newPlace(second, " first place CITY ", [uploadedPhoto(member, "second.jpg")]), { id: second });
  assert.deepEqual(await row("SELECT city_id, proposed_city_name, status FROM workspaces WHERE id = $1", [first]), {
    city_id: null, proposed_city_name: cityName, status: "pending",
  });
  const photos = await db.query("SELECT url, is_primary, is_approved FROM workspace_photos WHERE workspace_id = $1 ORDER BY is_primary DESC", [first]);
  assert.deepEqual(photos.rows, [
    { url: urls[0], is_primary: true, is_approved: false },
    { url: urls[1], is_primary: false, is_approved: false },
  ]);
  const workspaceSlugs = await db.query("SELECT slug FROM workspaces WHERE id IN ($1, $2)", [first, second]);
  assert.equal(new Set(workspaceSlugs.rows.map(({ slug }) => slug)).size, 2);
  await denied(db.query("UPDATE workspaces SET status = 'approved' WHERE id = $1", [first]));

  await role("anon");
  assert.equal(await row("SELECT id FROM cities WHERE name = $1", [cityName]), undefined);
  assert.equal(await row("SELECT id FROM workspaces WHERE id = $1", [first]), undefined);

  await role("authenticated", admin);
  await db.query("UPDATE workspaces SET status = 'under_review' WHERE id = $1", [first]);
  assert.equal(await row("SELECT id FROM cities WHERE name = $1", [cityName]), undefined);
  await db.query("UPDATE workspaces SET status = 'approved' WHERE id IN ($1, $2)", [first, second]);
  const city = await row("SELECT id, slug, workspace_count FROM cities WHERE name ILIKE $1", [cityName]);
  assert.equal(city.slug, "first-place-city-switzerland");
  assert.equal(city.workspace_count, 2);
  assert.deepEqual(await row("SELECT city_id, proposed_city_name FROM workspaces WHERE id = $1", [first]), {
    city_id: city.id, proposed_city_name: null,
  });
  await role("authenticated", member);
  assert.deepEqual(await newPlace(third, cityName, [uploadedPhoto(member, "third.jpg")]), { id: third });
  assert.deepEqual(await row("SELECT city_id, proposed_city_name FROM workspaces WHERE id = $1", [third]), {
    city_id: city.id, proposed_city_name: null,
  });
});

test("a photo insert failure rolls back the workspace and permits retrying the draft", async () => {
  const id = randomUUID();
  const invalid = uploadedPhoto(member, "fail.jpg");
  await role("postgres");
  await db.exec("ALTER TABLE workspace_photos ADD CONSTRAINT test_photo_failure CHECK (url NOT LIKE '%/fail.jpg')");
  try {
    await role("authenticated", member);
    await denied(newPlace(id, "Rollback City", [uploadedPhoto(member), invalid]), "23514");
    assert.equal(await row("SELECT id FROM workspaces WHERE id = $1", [id]), undefined);
    assert.equal(await row("SELECT id FROM workspace_photos WHERE workspace_id = $1", [id]), undefined);
    assert.deepEqual(await newPlace(id, "Rollback City", [uploadedPhoto(member)]), { id });
  } finally {
    await role("postgres");
    await db.exec("ALTER TABLE workspace_photos DROP CONSTRAINT test_photo_failure");
  }
});

test("saving AI decisions and approving a corrected city proposal share a transaction", async () => {
  const id = randomUUID();
  await role("authenticated", member);
  await newPlace(id, "Original Proposal", [uploadedPhoto(member)]);
  await role("service_role");
  const run = await enqueue(id, member);
  await db.query("UPDATE workspace_ai_enrichments SET status = 'ready_for_review', suggested_fields = '{\"description\":\"Reviewed text\"}' WHERE id = $1", [run.run_id]);
  await role("authenticated", admin);
  const save = (paths) => row(
    "SELECT public.save_workspace_ai_review_with_city_proposal($1, $2, $3, $4, 'Corrected Proposal', 'Switzerland') AS city",
    [id, run.run_id, JSON.stringify({ description: "Reviewed text", status: "approved", city_id: null }), paths],
  );
  await denied(save(["invalid_field"]), "22023");
  assert.deepEqual(await row("SELECT proposed_city_name, status FROM workspaces WHERE id = $1", [id]), {
    proposed_city_name: "Original Proposal", status: "pending",
  });
  const saved = await save(["description"]);
  assert.equal(saved.city.slug, "corrected-proposal-switzerland");
  assert.deepEqual(await row("SELECT description, city_id, proposed_city_name FROM workspaces WHERE id = $1", [id]), {
    description: "Reviewed text", city_id: saved.city.id, proposed_city_name: null,
  });
  assert.equal((await row("SELECT status FROM workspace_ai_enrichments WHERE id = $1", [run.run_id])).status, "applied");
});

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

test("visit observations enter moderator review without changing public session evidence", async () => {
  const id = randomUUID();
  const date = (await row("SELECT (now() AT TIME ZONE 'UTC')::date::text AS date")).date;
  const submit = (doors, laptops = "unknown", stay = "unknown", day = date) =>
    row("SELECT public.submit_workspace_visit_observation($1,$2,$3,$4,$5) AS id", [id, day, doors, laptops, stay]);
  const queue = () => db.query("SELECT * FROM public.list_workspace_session_review()");
  await role("anon");
  await denied(queue());
  await denied(submit("open"));
  await role("authenticated", member);
  await denied(queue());
  await newPlace(id, "Visit Test City", [uploadedPhoto(member)], { name: "Visit Test Cafe", address: "1 Visit Street" });
  await denied(submit("open"), "22023");
  await role("authenticated", admin);
  await db.query("UPDATE workspaces SET status='approved' WHERE id=$1", [id]);
  await role("authenticated", member);
  await denied(submit("unknown"), "22023");
  await denied(submit("closed", "allowed"), "22023");
  await denied(submit("open", "allowed", "unknown", "2000-01-01"), "22023");
  const report = await submit("open", "restricted", "limit_seen");
  await denied(submit("closed"), "23505");
  await role("anon");
  assert.equal(await row("SELECT workspace_id FROM workspace_session_hours WHERE workspace_id=$1", [id]), undefined);
  await role("authenticated", admin);
  assert.equal((await queue()).rows.find((item) => item.workspace_id === id).reason, "visit_report");
  await db.query("UPDATE workspace_edit_suggestions SET status='reviewing' WHERE id=$1", [report.id]);
  assert.equal((await queue()).rows.find((item) => item.workspace_id === id).visit_reports, 1);
  await db.query("UPDATE workspace_edit_suggestions SET status='resolved' WHERE id=$1", [report.id]);
  assert.equal((await queue()).rows.find((item) => item.workspace_id === id).reason, "unchecked");
});

test("the verified library pilot records distinct exceptions and never assumes a stay limit", async () => {
  await role("postgres");
  await db.exec(`
    INSERT INTO public.cities (name,country,slug)
    SELECT v.* FROM (VALUES ('Zürich','Switzerland','zurich-pilot'), ('New York','United States','new-york-pilot')) v(name,country,slug)
    WHERE NOT EXISTS (SELECT FROM public.cities c WHERE c.name=v.name AND c.country=v.country)
  `);
  const source = await readFile(new URL("../supabase/data-patches/publish-verified-libraries-20261116.sql", import.meta.url), "utf8");
  const dated = source.replaceAll("now()", "TIMESTAMPTZ '2026-11-16 12:00:00Z'");
  await db.exec(dated);
  await db.exec(dated);
  const result = await db.query(`
    SELECT w.slug, w.time_limit_hours AS stay, h.published->'laptopAccess'->'exceptions'->'2026-11-26' AS thanksgiving,
           h.published->'opening'->'exceptions'->'2026-12-26' AS boxing_day
    FROM public.workspaces w JOIN public.workspace_session_hours h ON h.workspace_id=w.id
    WHERE w.slug IN ('zentralbibliothek-zurich','brooklyn-public-library-central-new-york') ORDER BY w.slug
  `);
  assert.deepEqual(result.rows, [
    { slug: "brooklyn-public-library-central-new-york", stay: null, thanksgiving: [], boxing_day: null },
    { slug: "zentralbibliothek-zurich", stay: null, thanksgiving: null, boxing_day: [[540, 1140]] },
  ]);
});

test("ETH schedules preserve campus-specific exceptions and personal-laptop unknowns", async () => {
  await role("postgres");
  await db.exec(`
    INSERT INTO public.cities (name,country,slug)
    SELECT 'Zürich','Switzerland','eth-zurich-test'
    WHERE NOT EXISTS (SELECT FROM public.cities WHERE name='Zürich' AND country='Switzerland')
  `);
  const source = await readFile(new URL("../supabase/data-patches/publish-verified-zurich-eth-libraries-20261116.sql", import.meta.url), "utf8");
  const dated = source.replaceAll("now()", "TIMESTAMPTZ '2026-11-16 12:00:00Z'");
  await db.exec(dated);
  await db.exec(dated);
  const { rows: places } = await db.query(`
    SELECT w.slug, w.time_limit_hours AS stay, h.published->'laptopAccess'->'maxSessionMinutes' AS laptop_limit,
      h.published->'opening'->'exceptions'->'2026-11-21' AS eth_day,
      h.published->'opening'->'exceptions'->'2026-12-24' AS christmas_eve,
      h.published->'opening'->'exceptions'->'2027-01-03' AS end_of_closure
    FROM public.workspaces w JOIN public.workspace_session_hours h ON h.workspace_id=w.id
    WHERE w.slug LIKE 'eth-%' ORDER BY w.slug
  `);
  assert.deepEqual(places, [
    { slug: "eth-architecture-civil-engineering-library-zurich", stay: null, laptop_limit: null, eth_day: null, christmas_eve: [[480,720]], end_of_closure: [] },
    { slug: "eth-library-reading-room-zurich", stay: null, laptop_limit: null, eth_day: [], christmas_eve: [[480,720]], end_of_closure: [] },
  ]);
});

test("Zurich café and coworking evidence separates ordinary hours from date-specific access", async () => {
  await role("postgres");
  await db.exec(`
    INSERT INTO public.cities (name,country,slug)
    SELECT 'Zürich','Switzerland','zurich-cafe-test'
    WHERE NOT EXISTS (SELECT FROM public.cities WHERE name='Zürich' AND country='Switzerland')
  `);
  const source = await readFile(new URL("../supabase/data-patches/publish-verified-zurich-cafe-coworking-20261117.sql", import.meta.url), "utf8");
  const dated = source.replaceAll("now()", "TIMESTAMPTZ '2026-11-17 12:00:00Z'");
  await db.exec(dated);
  await db.exec(dated);
  const { rows: venues } = await db.query(`
    SELECT w.slug, w.type, w.laptop_friendly, w.has_wifi,
      h.draft->'opening'->'weekly'->'Sat' AS saturday_draft,
      h.published->'opening'->'exceptions'->'2026-12-24' AS christmas,
      h.published->'laptopAccess'->'maxSessionMinutes' AS day_pass,
      p.url AS photo
    FROM public.workspaces w JOIN public.workspace_session_hours h ON h.workspace_id=w.id
    LEFT JOIN public.workspace_photos p ON p.workspace_id=w.id AND p.is_approved
    WHERE w.slug IN ('cafe-du-bonheur-zurich','westhive-hardturm-zurich','westhive-paradeplatz-zurich') ORDER BY w.slug
  `);
  assert.deepEqual(venues, [
    { slug: "cafe-du-bonheur-zurich", type: "cafe", laptop_friendly: true, has_wifi: null,
      saturday_draft: [[600,1080]], christmas: null, day_pass: null, photo: "/images/zurich-bullingerplatz-roland-fischer.jpg" },
    ...["westhive-hardturm-zurich","westhive-paradeplatz-zurich"].map((slug) => ({
      slug, type: "coworking", laptop_friendly: true, has_wifi: true,
      saturday_draft: null, christmas: [], day_pass: 750,
      photo: slug === "westhive-hardturm-zurich" ? "/images/zurich-hardturmstrasse-161-tschubby.jpg" : null,
    })),
  ]);
});

test("Büro Züri confirms free desk windows while Kraftwerk only confirms café hours", async () => {
  await role("postgres");
  await db.exec(`
    INSERT INTO public.cities (name,country,slug)
    SELECT 'Zürich','Switzerland','zurich-buero-test'
    WHERE NOT EXISTS (SELECT FROM public.cities WHERE name='Zürich' AND country='Switzerland')
  `);
  const source = await readFile(new URL("../supabase/data-patches/publish-verified-zurich-kraftwerk-buero-20261117.sql", import.meta.url), "utf8");
  const checkDate = "2026-11-17T12:00:00Z";
  const dated = source.replaceAll("now()", `TIMESTAMPTZ '${checkDate}'`);
  await db.exec(dated);
  await db.exec(dated);
  const venues = (await db.query(`
    SELECT w.slug,w.laptop_friendly,h.published
    FROM public.workspaces w JOIN public.workspace_session_hours h ON h.workspace_id=w.id
    WHERE w.slug IN ('buero-zueri-zurich','kraftwerk-cafe-zurich') ORDER BY w.slug
  `)).rows;
  assert.equal(venues.length, 2);
  const [office, cafe] = venues;
  assert.equal(office.laptop_friendly, true);
  assert.equal(cafe.laptop_friendly, null);
  const assesses = ({ published }, startAt, durationMinutes = 120) => createSessionAssessment({
    now: Date.parse(checkDate), startAt: Date.parse(startAt), durationMinutes,
  })({ timeZone: published.timeZone, opening: { ...published.opening, checkedAt: checkDate },
    laptopAccess: { ...published.laptopAccess, checkedAt: checkDate } });
  assert.equal(assesses(office, "2026-11-21T10:00Z").availability, "fits");
  assert.equal(assesses(office, "2026-11-21T15:00Z").availability, "does_not_fit");
  assert.equal(assesses(office, "2026-12-25T09:00Z").availability, "does_not_fit");
  for (const date of ["2026-12-24", "2026-12-31", "2027-01-02"]) {
    assert.equal(assesses(office, `${date}T10:00Z`).availability, "unknown");
  }
  assert.deepEqual(assesses(cafe, "2026-11-23T09:00Z"), {
    availability: "unknown", missing: ["Laptop access unknown for part of this session"],
  });
  assert.equal(assesses(cafe, "2026-11-23T19:00Z").availability, "does_not_fit");
  assert.equal(assesses(cafe, "2026-12-21T09:00Z").availability, "does_not_fit");
});

test("merging Lisbon retains workspace IDs, profile links and published evidence", async () => {
  const [first, second, legacyPlace] = [randomUUID(), randomUUID(), randomUUID()];
  await role("postgres");
  await db.query("INSERT INTO public.cities (id,name,slug,country) VALUES ($1,'Lisbon','lisbon','Portugal'),($2,'Lisboa','lisboa-portugal','Portugal')", [first, second]);
  await db.query("INSERT INTO public.workspaces (id,city_id,name,slug,status) VALUES ($1,$2,'Legacy cafe','legacy-cafe','approved')", [legacyPlace, second]);
  await db.query("UPDATE public.profiles SET city_id=$1 WHERE id=$2", [second, member]);
  await db.query("INSERT INTO public.workspace_session_hours (workspace_id,published,checked_at,revision) VALUES ($1,$2,'2026-11-16T08:00Z',2)", [legacyPlace, { timeZone: "Europe/Lisbon" }]);
  await db.query("INSERT INTO public.workspace_work_fact_checks (workspace_id,checked_by,checked_at) VALUES ($1,$2,'2026-11-16T08:00Z')", [legacyPlace, admin]);
  await apply("20261116000300_merge_lisbon_city.sql");
  assert.deepEqual(await row("SELECT id,name,workspace_count FROM public.cities WHERE slug='lisbon'"), { id: first, name: "Lisboa", workspace_count: 1 });
  assert.equal(await row("SELECT id FROM public.cities WHERE id=$1", [second]), undefined);
  assert.equal((await row("SELECT city_id FROM public.workspaces WHERE id=$1", [legacyPlace])).city_id, first);
  assert.equal((await row("SELECT city_id FROM public.profiles WHERE id=$1", [member])).city_id, first);
  assert.deepEqual((await row("SELECT published,revision FROM public.workspace_session_hours WHERE workspace_id=$1", [legacyPlace])),
    { published: { timeZone: "Europe/Lisbon" }, revision: 3 });
  assert.equal((await row("SELECT checked_by FROM public.workspace_work_fact_checks WHERE workspace_id=$1", [legacyPlace])).checked_by, admin);
  await denied(db.query("INSERT INTO public.cities (name,slug,country) VALUES ('LISBON','duplicate-lisbon','Portugal')"), "23505");
  await role("authenticated", anotherMember);
  const submitted = randomUUID();
  await row("SELECT public.submit_workspace_with_photos($1,'Lisbon','Portugal',$2,$3)",
    [submitted, { name: "New Lisbon place", latitude: 38.72, longitude: -9.14 }, [uploadedPhoto(anotherMember)]]);
  assert.deepEqual(await row("SELECT city_id,proposed_city_name FROM public.workspaces WHERE id=$1",[submitted]),
    { city_id: first, proposed_city_name: null });
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
