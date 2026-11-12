import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const settings = {
  baseUrl: process.env.LUMEN_E2E_BASE_URL,
  url: process.env.LUMEN_E2E_SUPABASE_URL,
  publishableKey: process.env.LUMEN_E2E_SUPABASE_PUBLISHABLE_KEY,
  secretKey: process.env.LUMEN_E2E_SUPABASE_SECRET_KEY,
  memberEmail: process.env.LUMEN_E2E_MEMBER_EMAIL,
  memberPassword: process.env.LUMEN_E2E_MEMBER_PASSWORD,
  adminEmail: process.env.LUMEN_E2E_ADMIN_EMAIL,
  adminPassword: process.env.LUMEN_E2E_ADMIN_PASSWORD,
};

test.skip(
  process.env.LUMEN_E2E_ALLOW_WRITES !== "staging" || Object.values(settings).some((value) => !value),
  "Requires an explicitly opted-in staging app, database, and two test accounts",
);

test("a member submission can be reviewed, saved, previewed, and published", async ({ page, browser }) => {
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const member = createClient(settings.url!, settings.publishableKey!, options);
  const service = createClient(settings.url!, settings.secretKey!, options);
  const { data: login, error: loginError } = await member.auth.signInWithPassword({
    email: settings.memberEmail!, password: settings.memberPassword!,
  });
  expect(loginError).toBeNull();
  expect((await member.rpc("is_admin")).data).toBe(false);

  const id = randomUUID();
  const cityId = randomUUID();
  const citySlug = `e2e-city-${cityId}`;
  const slug = `e2e-cafe-${id}`;
  const publicPath = `/cities/${citySlug}/${slug}`;
  const suggestion = "A quiet table by the window works well for focused laptop sessions.";

  try {
    expect((await service.from("cities").insert({ id: cityId, name: citySlug, slug: citySlug, country: "Switzerland" })).error).toBeNull();
    expect((await member.from("workspaces").insert({
      id, name: "E2E Cafe", slug, city_id: cityId, status: "pending", submitted_by: login.user!.id,
      address: "1 Test Street", latitude: 47.37, longitude: 8.54,
    })).error).toBeNull();
    expect((await service.from("workspace_ai_enrichments").insert({
      workspace_id: id, requested_by: login.user!.id, status: "ready_for_review", model: "e2e-fixture",
      suggested_fields: { description: suggestion },
    })).error).toBeNull();

    await page.goto("/login");
    await page.locator('input[type="email"]').fill(settings.adminEmail!);
    await page.locator('input[type="password"]').fill(settings.adminPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await page.goto(`/admin/workspaces/${id}`);

    await page.getByRole("checkbox", { name: "Select Description", exact: true }).check();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Apply selected" }).click();
    await expect(page.getByRole("button", { name: "Save before preview" }).first()).toBeDisabled();
    expect((await service.from("workspaces").select("description").eq("id", id).single()).data?.description).toBeNull();

    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByRole("link", { name: "Admin preview" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Public after approval" }).first()).toBeDisabled();
    const preview = await page.context().newPage();
    await preview.goto(`/admin/workspaces/${id}/preview`);
    await expect(preview.getByText(suggestion, { exact: true }).first()).toBeVisible();
    await preview.close();

    await page.getByRole("combobox", { name: "Workspace status" }).click();
    await page.getByRole("option", { name: "approved", exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByRole("link", { name: "Public view" }).first()).toHaveAttribute("href", publicPath);

    const visitor = await browser.newContext({ baseURL: settings.baseUrl });
    try {
      const publicPage = await visitor.newPage();
      await publicPage.goto(publicPath);
      await expect(publicPage.getByText(suggestion, { exact: true }).first()).toBeVisible();
    } finally {
      await visitor.close();
    }
  } finally {
    const deletedPlace = await service.from("workspaces").delete().eq("id", id);
    const deletedCity = await service.from("cities").delete().eq("id", cityId);
    expect(deletedPlace.error ?? deletedCity.error).toBeNull();
  }
});
