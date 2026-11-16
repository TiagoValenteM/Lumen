import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "@playwright/test";

const moderator = { id: "00000000-0000-4000-8000-000000000001", email: "moderator@example.test",
  aud: "authenticated", app_metadata: {}, user_metadata: {} };
const city = { id: "00000000-0000-4000-8000-000000000002", slug: "hours-test", name: "Hours Test", country: "Switzerland" };
const place = { id: "00000000-0000-4000-8000-000000000003", slug: "hours-test-cafe", name: "Hours Test Cafe",
  address: "1 Test Street", type: "cafe", status: "approved", city_id: city.id, city,
  latitude: 47, longitude: 8, laptop_friendly: true, time_limit_hours: null, workspace_photos: [] };

test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");
test.use({ viewport: { width: 390, height: 844 }, timezoneId: "UTC", reducedMotion: "reduce" });

test("moderator draft, verified exception and withdrawal reach the guest finder through real SQL", async ({ page, browser }) => {
  const db = await PGlite.create();
  const guest = await browser.newPage();
  try {
    await db.exec(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE SCHEMA auth;
      CREATE SCHEMA lumen_private;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid STABLE LANGUAGE sql
        AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      CREATE FUNCTION public.is_admin() RETURNS boolean STABLE LANGUAGE sql
        AS 'SELECT auth.uid() = ''${moderator.id}''::uuid';
      CREATE TABLE public.workspaces (id uuid PRIMARY KEY, slug text, name text, address text, city_id uuid,
        latitude numeric, longitude numeric, status text, laptop_friendly boolean, time_limit_hours numeric);
      GRANT SELECT ON public.workspaces TO anon, authenticated;
    `);
    await db.query("INSERT INTO auth.users VALUES ($1)", [moderator.id]);
    await db.query("INSERT INTO workspaces VALUES ($1,$2,$3,$4,$5,$6,$7,'approved',true,NULL)",
      [place.id, place.slug, place.name, place.address, city.id, place.latitude, place.longitude]);
    await db.exec(await readFile("supabase/migrations/20261116000100_manage_workspace_session_hours.sql", "utf8"));

    await page.context().route("**/auth/v1/token?**", (route) => {
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const encoded = Buffer.from(JSON.stringify({ exp: expiry, sub: moderator.id })).toString("base64url");
      return route.fulfill({ json: { access_token: `eyJhbGciOiJIUzI1NiJ9.${encoded}.fixture`, refresh_token: "fixture",
        token_type: "bearer", expires_in: 3600, expires_at: expiry, user: moderator } });
    });
    await page.context().route("**/rest/v1/**", async (route) => {
      const table = new URL(route.request().url()).pathname.split("/").at(-1);
      if (table === "is_admin") return route.fulfill({ json: true });
      if (table === "profiles" || table === "get_workspace_admin_notes") return route.fulfill({ json: null });
      if (table === "workspaces") return route.fulfill({ json: place });
      if (table === "read_workspace_session_hours" || table === "update_workspace_session_hours") {
        const body = route.request().postDataJSON();
        try {
          const result = await db.transaction(async (tx) => {
            await tx.exec("SET LOCAL ROLE authenticated");
            await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [moderator.id]);
            const { rows } = table === "read_workspace_session_hours"
              ? await tx.query<{ value: unknown }>("SELECT public.read_workspace_session_hours($1) AS value", [body.workspace_uuid])
              : await tx.query<{ value: unknown }>("SELECT public.update_workspace_session_hours($1,$2,$3,$4,$5) AS value",
                [body.workspace_uuid, body.expected_revision, body.expected_place, body.action, body.schedule]);
            return rows[0].value;
          });
          return route.fulfill({ json: result });
        } catch (error) {
          if (!(error instanceof Error) || !("code" in error)) throw error;
          const status = error.code === "40001" ? 500 : error.code === "42501" ? 403 : 400;
          return route.fulfill({ status, json: { code: error.code, message: error.message } });
        }
      }
      return route.fulfill({ json: [] });
    });
    await guest.route("**/rest/v1/**", async (route) => {
      const table = new URL(route.request().url()).pathname.split("/").at(-1);
      if (table === "cities") return route.fulfill({ json: [city] });
      if (table === "workspaces") return route.fulfill({ json: [place] });
      if (table === "workspace_session_hours") {
        const rows = await db.transaction(async (tx) => {
          await tx.exec("SET LOCAL ROLE anon");
          return (await tx.query(`SELECT h.workspace_id,h.published,h.checked_at FROM workspace_session_hours h
            JOIN workspaces w ON w.id=h.workspace_id WHERE w.city_id=$1`, [city.id])).rows;
        });
        return route.fulfill({ json: rows });
      }
      return route.fulfill({ json: [] });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(moderator.email);
    await page.getByLabel("Password").fill("fixture-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto(`/admin/workspaces/${place.id}`);
    const editor = page.getByRole("region", { name: "Session hours" });
    await editor.getByRole("button", { name: "Edit hours" }).click();
    await expect(editor.getByText("No verified hours are published.")).toBeVisible();
    const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    const covered = (day: string) => `${process.env.LUMEN_E2E_BASE_URL}/find?city=${city.slug}&minutes=60&session=${day}T12%3A00Z`;
    const match = guest.getByRole("list", { name: "Matching places" });
    const details = guest.getByRole("list", { name: "Places with details to check" });
    const placeLink = guest.getByRole("link", { name: place.name, exact: true });
    await editor.getByLabel("Venue timezone").fill("UTC");
    await editor.getByLabel("Public note").fill("A purchase is required.");
    await editor.getByRole("button", { name: "Hide hours editor" }).click();
    await editor.getByRole("button", { name: "Edit hours" }).click();
    await expect(editor.getByLabel("Public note")).toHaveValue("A purchase is required.");
    for (const label of ["Opening hours", "Laptop access"]) {
      const panel = editor.locator("details").filter({ hasText: label });
      await panel.locator("summary").click();
      await panel.getByLabel("Policy source URL", { exact: true }).fill("https://example.org/hours");
      await panel.getByLabel("Holiday or exceptions source URL").fill("https://example.org/holidays");
      await panel.getByLabel("Exceptions checked through").fill(future(7));
      for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
        await panel.getByLabel(day, { exact: true }).fill(label === "Opening hours" ? "08:00-20:00" : "11:00-14:00");
      }
      if (label === "Laptop access") await panel.getByLabel("Stay limit (minutes)").fill("90");
      await panel.getByRole("button", { name: "Add exception" }).click();
      await panel.getByLabel("Exception date 1").fill(future(2));
      await panel.getByLabel("Exception hours 1").fill("Closed");
    }
    await editor.getByRole("button", { name: "Save hours draft" }).click();
    await expect(editor.getByText("Draft saved. Public hours were not changed.")).toBeVisible();
    await guest.goto(covered(future(1)));
    await expect(details).toBeVisible();
    await expect(match).toHaveCount(0);

    await editor.getByRole("checkbox", { name: /I checked both schedules/ }).check();
    await editor.getByRole("button", { name: "Verify and publish hours" }).click();
    await expect(editor.getByText("Hours verified and published.")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await guest.reload();
    await expect(match.getByText("A purchase is required.", { exact: false })).toBeVisible();
    await guest.goto(covered(future(2)));
    await expect(guest.getByRole("heading", { name: "No matches", exact: true })).toBeVisible();
    await expect(placeLink).toHaveCount(0);

    const second = await page.context().newPage();
    await second.goto(`/admin/workspaces/${place.id}`);
    const otherEditor = second.getByRole("region", { name: "Session hours" });
    await otherEditor.getByRole("button", { name: "Edit hours" }).click();
    await expect(otherEditor.getByLabel("Public note")).toHaveValue("A purchase is required.");
    await editor.getByLabel("Public note").fill("A newer draft policy.");
    await editor.getByRole("button", { name: "Save hours draft" }).click();
    await expect(editor.getByText("Draft saved. Public hours were not changed.")).toBeVisible();
    await otherEditor.getByLabel("Public note").fill("An older edit.");
    await otherEditor.getByRole("button", { name: "Save hours draft" }).click();
    await expect(otherEditor.getByRole("alert")).toContainText("The hours changed. Reload before saving.");
    await expect(otherEditor.getByLabel("Public note")).toHaveValue("An older edit.");
    await otherEditor.getByRole("button", { name: "Reload saved hours" }).click();
    await expect(otherEditor.getByLabel("Public note")).toHaveValue("A newer draft policy.");
    await guest.goto(covered(future(1)));
    await expect(match.getByText("A purchase is required.", { exact: false })).toBeVisible();
    await expect(match.getByText("A newer draft policy.", { exact: false })).toHaveCount(0);
    await second.close();

    await editor.getByRole("button", { name: "Withdraw verification" }).click();
    await expect(editor.getByText("Public verification withdrawn.")).toBeVisible();
    await guest.goto(covered(future(1)));
    await expect(details.getByRole("link", { name: place.name, exact: true })).toBeVisible();
    await expect(match).toHaveCount(0);
  } finally {
    await guest.close();
    await db.close();
  }
});
