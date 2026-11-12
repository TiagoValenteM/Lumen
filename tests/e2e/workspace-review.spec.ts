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

test("the first place in a new city stays private until a moderator publishes it", async ({ page, browser }) => {
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const member = createClient(settings.url!, settings.publishableKey!, options);
  const service = createClient(settings.url!, settings.secretKey!, options);
  const { data: login, error: loginError } = await member.auth.signInWithPassword({
    email: settings.memberEmail!, password: settings.memberPassword!,
  });
  expect(loginError).toBeNull();
  expect((await member.rpc("is_admin")).data).toBe(false);

  const id = randomUUID();
  const cityName = `E2E City ${id}`;
  const citySlug = `e2e-city-${id}-switzerland`;
  const slug = `e2e-cafe-${id}`;
  const publicPath = `/cities/${citySlug}/${slug}`;
  const photoPath = `${login.user!.id}/temp/${id}.png`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=", "base64");
  const suggestion = "A quiet table by the window works well for focused laptop sessions.";

  try {
    const photos = member.storage.from("workspace-photos");
    expect((await photos.upload(photoPath, png, { contentType: "image/png" })).error).toBeNull();
    const submission = await member.rpc("submit_workspace_with_photos", {
      submission_uuid: id,
      city_name: cityName,
      country_name: "Switzerland",
      details: { name: `E2E Cafe ${id}`, address: "1 Test Street", latitude: 47.37, longitude: 8.54, laptop_friendly: true },
      photo_urls: [photos.getPublicUrl(photoPath).data.publicUrl],
    });
    expect(submission.error).toBeNull();
    expect(submission.data).toBe(id);
    expect((await member.from("cities").select("id").eq("name", cityName).maybeSingle()).data).toBeNull();
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
    expect((await member.from("cities").select("id").eq("name", cityName).maybeSingle()).data).toBeNull();
    const preview = await page.context().newPage();
    await preview.goto(`/admin/workspaces/${id}/preview`);
    await expect(preview.getByText(suggestion, { exact: true }).first()).toBeVisible();
    await preview.close();

    await page.getByRole("combobox", { name: "Workspace status" }).click();
    await page.getByRole("option", { name: "approved", exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByRole("link", { name: "Public view" }).first()).toHaveAttribute("href", publicPath);
    await page.getByRole("button", { name: "Mark known facts checked" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Checked / })).toBeVisible();

    const visitor = await browser.newContext({ baseURL: settings.baseUrl });
    try {
      const publicPage = await visitor.newPage();
      await publicPage.goto(publicPath);
      await expect(publicPage.getByText(suggestion, { exact: true }).first()).toBeVisible();
      await expect(publicPage.getByText(/Known facts checked by a Lumen moderator/)).toBeVisible();
      await expect(publicPage.getByText("Unknown", { exact: true })).toHaveCount(3);

      await publicPage.goto(`/find?city=${citySlug}`);
      const placeName = `E2E Cafe ${id}`;
      const matches = publicPage.getByRole("list", { name: "Matching places" });
      const toCheck = publicPage.getByRole("list", { name: "Places with details to check" });
      await expect(toCheck.getByRole("link", { name: placeName, exact: true })).toBeVisible();
      await expect(matches.getByRole("link", { name: placeName, exact: true })).toHaveCount(0);

      await page.getByRole("button", { name: "No limit", exact: true }).click();
      await page.getByRole("button", { name: "Save changes" }).first().click();
      const check = page.getByRole("button", { name: "Mark known facts checked" });
      await expect(check).toBeEnabled();
      await check.click();
      await expect(page.getByRole("status").filter({ hasText: /^Checked / })).toBeVisible();
      await publicPage.reload();
      await expect(matches.getByRole("link", { name: placeName, exact: true })).toBeVisible();

      const ask = publicPage.getByRole("textbox", { name: "What kind of spot do you need?" });
      await ask.fill("Work for two hours with Wi-Fi");
      await ask.press("Enter");
      await expect(publicPage.getByRole("checkbox", { name: "Wi-Fi", exact: true })).toBeChecked();
      await expect(toCheck.getByRole("link", { name: placeName, exact: true })).toBeVisible();
      await expect(matches.getByRole("link", { name: placeName, exact: true })).toHaveCount(0);
    } finally {
      await visitor.close();
    }
  } finally {
    const deletedPlace = await service.from("workspaces").delete().eq("id", id);
    const deletedCity = await service.from("cities").delete().eq("slug", citySlug);
    const deletedPhoto = await service.storage.from("workspace-photos").remove([photoPath]);
    expect(deletedPlace.error ?? deletedCity.error ?? deletedPhoto.error).toBeNull();
  }
});
