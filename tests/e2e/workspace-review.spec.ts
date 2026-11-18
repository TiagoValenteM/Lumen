import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { assertStagingTarget } from "../support/staging-target.mjs";

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

async function guardBrowserDatabase(context: BrowserContext) {
  const expected = new URL(settings.url!).origin;
  await context.route(/\/(auth|rest|storage)\/v1\//, (route) => {
    if (new URL(route.request().url()).origin !== expected) return route.abort("blockedbyclient");
    return route.continue();
  });
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.skip(
  process.env.LUMEN_E2E_ALLOW_WRITES !== "staging" || Object.values(settings).some((value) => !value),
  "Requires an explicitly opted-in staging app, database, and two test accounts",
);

test("the first place in a new city stays private until a moderator publishes it", async ({ page, browser }) => {
  test.setTimeout(180_000);
  assertStagingTarget(settings.baseUrl!, settings.url!, process.env.LUMEN_E2E_CONFIRM_DATABASE_ORIGIN ?? "");
  await guardBrowserDatabase(page.context());
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const member = createClient(settings.url!, settings.publishableKey!, options);
  const service = createClient(settings.url!, settings.secretKey!, options);
  const { data: login, error: loginError } = await member.auth.signInWithPassword({
    email: settings.memberEmail!, password: settings.memberPassword!,
  });
  expect(loginError).toBeNull();
  expect((await member.rpc("is_admin")).data).toBe(false);

  const runId = randomUUID();
  const cityName = `E2E City ${runId}`;
  const citySlug = `e2e-city-${runId}-switzerland`;
  const placeName = `E2E Cafe ${runId}`;
  const slug = `e2e-cafe-${runId}`;
  const publicPath = `/cities/${citySlug}/${slug}`;
  let id = "";
  let photoPath = "";
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAIAAAABgCAIAAABaGO0eAAAACXBIWXMAAAPoAAAD6AG1e1JrAAABWElEQVR4nO3VSREDQRADwYVXaIaFeRuGHp0RQlC6vveL3g7Ch/6bRpABMaDLLdSAGNA8hhrQHIQJ6qZ8QAxoHkMNaA7CBHVTPiAGNI+hBjQHYYK6KR8QA5rHUAOagzBB3ZQPiAHNY6gBzUGYoG7KB8SA5jHUgOYgTFA35QNiQPMYakBzECaom/IBMaB5DDWgOQgT1E35gBjQPIYa0ByECeqmfEAMaB5DDWgOwgR1Uz4gBjSPoQY0B2GCuikfEAOax1ADmoMwQd2UD4gBzWOoAc1BmKBuygfEgOYx1IDmIExQN+UDYkDzGGpAcxAmqJvyATGgeQw1oDkIE9RN+YAY0DyGGtAchAnqpnxADGgeQw1oDsIEdVM+IAY0j6EGNAdhgropHxADmsdQA5qDMEHdlA+IAc1jqAHNQZigbsoHxIDmMdSA5iBMUDflA2JA8xhqQHMQJqg5i4n+kQwTdnCiI1MAAAAASUVORK5CYII=", "base64");
  const suggestion = "A quiet table by the window works well for focused laptop sessions.";
  const memberBrowser = await browser.newContext({ baseURL: settings.baseUrl, viewport: { width: 390, height: 844 } });
  await guardBrowserDatabase(memberBrowser);

  try {
    const memberPage = await memberBrowser.newPage();
    await memberPage.route("**/api/geocode/search?**", (route) => route.fulfill({ json: { results: [{
      id: "e2e-address", label: "E2E address result", address: "1 Test Street", city: cityName,
      country: "Switzerland", latitude: 47.37, longitude: 8.54, provider: "photon",
      providerId: "e2e-address", confidence: null, raw: {},
    }] } }));
    await test.step("member fills all form steps and uploads to real Storage", async () => {
      await signIn(memberPage, settings.memberEmail!, settings.memberPassword!);
      await memberPage.goto("/add-workspace");
      await memberPage.getByRole("textbox", { name: "Search place name or full address", exact: true }).fill("E2E address");
      await memberPage.getByRole("button", { name: "Search", exact: true }).click();
      await memberPage.getByRole("button", { name: /E2E address result/ }).click();
      await memberPage.getByLabel("Place name *", { exact: true }).fill(placeName);
      await expect(memberPage.getByLabel("City *", { exact: true })).toHaveValue(cityName);
      await memberPage.getByRole("button", { name: "Next", exact: true }).click();
      await expect(memberPage.getByText("Step 2 of 6", { exact: true })).toBeVisible();
      await memberPage.getByRole("button", { name: "Next", exact: true }).click();
      await expect(memberPage.getByText("Step 3 of 6", { exact: true })).toBeVisible();
      await memberPage.getByRole("button", { name: "Next", exact: true }).click();
      await memberPage.getByRole("combobox", { name: "Laptops welcome", exact: true }).click();
      await memberPage.getByRole("option", { name: "Yes", exact: true }).click();
      await memberPage.getByRole("button", { name: "Next", exact: true }).click();
      await expect(memberPage.getByText("Photos (required)", { exact: true })).toBeVisible();
      const uploaded = memberPage.waitForResponse((response) => response.request().method() === "POST" &&
        response.url().includes("/storage/v1/object/workspace-photos/"));
      await memberPage.locator('input[type="file"]').setInputFiles({ name: "e2e-place.png", mimeType: "image/png", buffer: png });
      const upload = await uploaded;
      expect(upload.ok()).toBe(true);
      photoPath = decodeURIComponent(new URL(upload.url()).pathname.split("/storage/v1/object/workspace-photos/")[1]);
      expect(photoPath.startsWith(`${login.user!.id}/temp/`)).toBe(true);
      await expect(memberPage.getByRole("img", { name: "Upload 1", exact: true })).toBeVisible();
      await expect.poll(() => memberPage.getByRole("img", { name: "Upload 1", exact: true })
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      const download = await service.storage.from("workspace-photos").download(photoPath);
      expect(download.error).toBeNull();
      expect(await download.data!.arrayBuffer()).toEqual(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength));
    });
    await test.step("member reviews and submits; guests cannot read the pending record", async () => {
      await memberPage.getByRole("button", { name: "Next", exact: true }).click();
      await expect(memberPage.getByText("Step 6 of 6", { exact: true })).toBeVisible();
      const submitted = memberPage.waitForResponse((response) => response.url().includes("/rest/v1/rpc/submit_workspace_with_photos"));
      await memberPage.getByRole("button", { name: "Submit place", exact: true }).click();
      const submission = await submitted;
      expect(submission.ok()).toBe(true);
      id = await submission.json();
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      await expect(memberPage).toHaveURL(/\/profile\/my-workspaces\?submitted=1$/);
      await expect(memberPage.getByText(placeName, { exact: true })).toBeVisible();
      const guest = createClient(settings.url!, settings.publishableKey!, options);
      expect((await guest.from("workspaces").select("id").eq("id", id)).data).toEqual([]);
      expect((await service.from("workspaces").select("status").eq("id", id).single()).data?.status).toBe("pending");
    });
    expect((await member.from("cities").select("id").eq("name", cityName).maybeSingle()).data).toBeNull();
    expect((await service.from("workspace_ai_enrichments").insert({
      workspace_id: id, requested_by: login.user!.id, status: "ready_for_review", model: "e2e-fixture",
      suggested_fields: { description: suggestion },
    })).error).toBeNull();

    await signIn(page, settings.adminEmail!, settings.adminPassword!);
    await page.goto(`/admin/workspaces/${id}`);

    await page.getByRole("checkbox", { name: "Select Description", exact: true }).check();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Apply selected" }).click();
    await expect(page.getByRole("button", { name: "Save before preview" }).first()).toBeDisabled();
    expect((await service.from("workspaces").select("description").eq("id", id).single()).data?.description ?? "").toBe("");

    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByRole("link", { name: "Admin preview" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Public after approval" }).first()).toBeDisabled();
    expect((await member.from("cities").select("id").eq("name", cityName).maybeSingle()).data).toBeNull();
    const preview = await page.context().newPage();
    await preview.goto(`/admin/workspaces/${id}/preview`);
    await expect(preview.getByText(suggestion, { exact: true }).first()).toBeVisible();
    await preview.close();

    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect.poll(async () => (await service.from("workspace_photos").select("is_approved").eq("workspace_id", id).single()).data?.is_approved).toBe(true);
    await page.getByRole("combobox", { name: "Workspace status" }).click();
    await page.getByRole("option", { name: "approved", exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect.poll(async () => (await service.from("workspaces").select("status").eq("id", id).single()).data?.status).toBe("approved");
    await expect(page.getByRole("link", { name: "Public view" }).first()).toHaveAttribute("href", publicPath);
    expect((await service.from("cities").select("id").eq("slug", citySlug)).data).toHaveLength(1);
    await page.getByRole("button", { name: "Mark known facts checked" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Checked / })).toBeVisible();

    const visitor = await browser.newContext({ baseURL: settings.baseUrl });
    await guardBrowserDatabase(visitor);
    try {
      const publicPage = await visitor.newPage();
      await publicPage.goto(publicPath);
      await expect(publicPage.getByText(suggestion, { exact: true }).first()).toBeVisible();
      await expect(publicPage.getByText(/Known facts checked by a Lumen moderator/)).toBeVisible();
      await expect.poll(() => publicPage.locator("img").evaluateAll((images) => images.some((image) =>
        (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      await publicPage.screenshot({ path: test.info().outputPath("published-place.png") });

      await publicPage.goto(`/find?city=${citySlug}`);
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
      const filters = publicPage.locator("summary").filter({ hasText: "Filters" });
      await expect(filters).toContainText("Wi-Fi");
      await filters.click();
      await expect(publicPage.getByRole("checkbox", { name: "Wi-Fi", exact: true })).toBeChecked();
      await expect(toCheck.getByRole("link", { name: placeName, exact: true })).toBeVisible();
      await expect(matches.getByRole("link", { name: placeName, exact: true })).toHaveCount(0);
    } finally {
      await visitor.close();
    }
  } finally {
    await memberBrowser.close();
    const deletedPlace = id ? await service.from("workspaces").delete().eq("id", id) : { error: null };
    const deletedCity = await service.from("cities").delete().eq("slug", citySlug);
    const deletedPhoto = photoPath ? await service.storage.from("workspace-photos").remove([photoPath]) : { error: null };
    expect(deletedPlace.error ?? deletedCity.error ?? deletedPhoto.error).toBeNull();
  }
});
