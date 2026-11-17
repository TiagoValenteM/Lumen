import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { confirmImportTarget, leadStatus, workspaceLeadRow } from "../scripts/location-imports/import-policy.mjs";
import { assertStagingTarget } from "./support/staging-target.mjs";

test("lead rows cannot become approved or make claims from source scores", () => {
  assert.throws(() => leadStatus("approved"), /pending or under_review/);
  const row = workspaceLeadRow({ name: "Cafe", has_wifi: false, has_power_outlets: true,
    laptop_friendly: true, time_limit_hours: 2, location_raw: { original: true } }, "city");
  for (const key of ["has_wifi", "has_power_outlets", "laptop_friendly", "time_limit_hours"]) assert.equal(row[key], null);
  assert.deepEqual(row.location_raw, { original: true });
  assert.equal(row.city_id, "city");
});

test("operator writes require explicit confirmation and staging refuses production", () => {
  const database = "https://example.supabase.co";
  assert.equal(confirmImportTarget(database, database), database);
  for (const expected of [undefined, "https://other.supabase.co", `${database}/rest/v1`, `${database}/`]) {
    assert.throws(() => confirmImportTarget(database, expected));
  }
  assert.throws(() => assertStagingTarget("https://lumen-lime.vercel.app", database, database), /refuse production/);
  const production = "https://kcmksmoicpgjfbufliwd.supabase.co";
  assert.throws(() => assertStagingTarget("https://staging.example", production, production), /refuse production/);
  assert.throws(() => assertStagingTarget("https://staging.example", database, ""), /Confirm/);
  assert.doesNotThrow(() => assertStagingTarget("https://staging.example", database, database));
});

test("generated SQL inserts new records without modifying published listings or city counts", async () => {
  const folder = await mkdtemp(join(tmpdir(), "lumen-leads-"));
  const database = await PGlite.create();
  try {
    const input = join(folder, "leads.json");
    const json = join(folder, "draft.json");
    const sql = join(folder, "draft.sql");
    const lead = { city_name: "Test City", country: "Switzerland", type: "cafe", has_wifi: true };
    await writeFile(input, JSON.stringify({ leads: [{ ...lead, name: "Existing Cafe" }, { ...lead, name: "New Cafe" }] }));
    execFileSync(process.execPath, ["scripts/location-imports/build-workspace-import.mjs", "--input", input,
      "--json-output", json, "--sql-output", sql]);
    const dry = execFileSync(process.execPath, ["scripts/location-imports/push-workspaces.mjs", "--input", json], { encoding: "utf8" });
    assert.match(dry, /Dry run complete/);
    await database.exec(`
      CREATE TABLE cities (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text, slug text UNIQUE, country text, country_code text,
        workspace_count integer DEFAULT 0);
      CREATE TABLE workspaces (city_id integer REFERENCES cities(id), name text, slug text UNIQUE, type text, status text,
        address text, latitude numeric, longitude numeric, website text, phone text, has_wifi boolean, has_power_outlets boolean,
        laptop_friendly boolean, time_limit_hours integer, location_source text, location_provider text, location_provider_id text,
        location_confidence numeric, location_raw jsonb, admin_notes text);
      INSERT INTO cities (name,slug,country,workspace_count) VALUES ('Canonical City Name','test-city-switzerland','Switzerland',8);
      INSERT INTO workspaces (city_id,name,slug,type,status,has_wifi) VALUES (1,'Verified Cafe','existing-cafe-test-city','cafe','approved',true);
    `);
    const command = await readFile(sql, "utf8");
    await database.exec(command);
    await database.exec(command);
    assert.deepEqual((await database.query("SELECT name,workspace_count FROM cities")).rows, [
      { name: "Canonical City Name", workspace_count: 8 },
    ]);
    assert.deepEqual((await database.query("SELECT name,status,has_wifi FROM workspaces ORDER BY slug")).rows, [
      { name: "Verified Cafe", status: "approved", has_wifi: true },
      { name: "New Cafe", status: "pending", has_wifi: null },
    ]);
  } finally {
    await database.close();
    await rm(folder, { recursive: true, force: true });
  }
});
