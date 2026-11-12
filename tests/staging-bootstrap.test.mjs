import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { buildStagingBootstrap } from "../scripts/build-staging-bootstrap.mjs";

const readCheck = (file) => readFile(new URL(`../supabase/checks/${file}`, import.meta.url), "utf8");

test("staging bootstrap installs the complete schema without default Data API grants", async () => {
  const db = await PGlite.create({ extensions: { uuid_ossp } });
  try {
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
      CREATE SCHEMA storage;
      CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
      CREATE TABLE storage.objects (bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS 'SELECT string_to_array($1, ''/'')';
      GRANT USAGE ON SCHEMA storage TO authenticated;
      GRANT SELECT, INSERT ON storage.objects TO authenticated;
    `);
    const rolloutCheck = await readCheck("lumen-rollout.sql");
    assert.ok(Object.values((await db.query(rolloutCheck)).rows[0]).every((value) => value === false));
    const sql = await buildStagingBootstrap();
    // PGlite ships uuid-ossp but not pgcrypto; current PostgreSQL has gen_random_uuid built in.
    const bootstrap = sql.replace('create extension if not exists "pgcrypto";', "");
    await db.exec(bootstrap);
    const checked = (await db.query(rolloutCheck)).rows[0];
    assert.ok(Object.values(checked).every((value) => value === true), JSON.stringify(checked));
    assert.deepEqual((await db.query(await readCheck("find-a-spot-pilot.sql"))).rows, []);

    await assert.rejects(db.exec(bootstrap), /Refusing to bootstrap an existing Lumen database/);
    await db.exec("ROLLBACK");
    const member = "00000000-0000-0000-0000-000000000001";
    await db.query("INSERT INTO auth.users VALUES ($1)", [member]);
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [member]);
    await db.exec("SET ROLE authenticated");
    await assert.rejects(db.query("INSERT INTO storage.objects VALUES ('workspace-photos', 'another-user/temp/photo.jpg')"), /row-level security/);
    await db.query("INSERT INTO storage.objects VALUES ('workspace-photos', $1)", [`${member}/temp/photo.jpg`]);
    const id = "00000000-0000-0000-0000-000000000002";
    const photo = `https://staging.supabase.co/storage/v1/object/public/workspace-photos/${member}/temp/photo.jpg`;
    const { rows } = await db.query("SELECT public.submit_workspace_with_photos($1, 'Test City', 'Switzerland', $2, $3) AS id", [
      id, { name: "Test place", latitude: 47, longitude: 8 }, [photo],
    ]);
    assert.equal(rows[0].id, id);
  } finally {
    await db.close();
  }
});
