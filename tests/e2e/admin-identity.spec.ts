import { expect, test, type Page } from "@playwright/test";

const place = {
  id: "e81da884-7100-41fb-a986-266583fc2829", name: "Central Library for Research and International Remote Working",
  city_id: "zurich", city: { name: "Zürich", slug: "zurich", country: "Switzerland" },
  slug: "central-library", status: "pending", type: "library", address: "Zähringerplatz 6",
  latitude: 47.3732, longitude: 8.544, short_description: "Saved summary", description: "Saved description",
};
const editor = `/admin/workspaces/${place.id}`;
const enrichment = {
  id: "fixture-run", workspace_id: place.id, status: "ready_for_review", run_mode: "full", model: "fixture/free",
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  suggested_fields: { description: "Proposed description" },
};

type WorkspaceFixture = Omit<typeof place, "latitude" | "longitude"> & { latitude: number | null; longitude: number | null };

async function mockAdmin(page: Page, admin: boolean, workspace: WorkspaceFixture = place) {
  const writes: string[] = [];
  const context = page.context();
  const user = { id: "46563422-f571-4640-8f4d-6ea33f9d85e7", aud: "authenticated", email: "test@example.com", app_metadata: {}, user_metadata: {} };
  await context.route("**/auth/v1/token?**", async (route) => {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const jwt = Buffer.from(JSON.stringify({ exp: expiry, sub: user.id })).toString("base64url");
    await route.fulfill({ json: { access_token: `eyJhbGciOiJIUzI1NiJ9.${jwt}.fixture`, refresh_token: "fixture", token_type: "bearer", expires_at: expiry, expires_in: 3600, user } });
  });

  let ai = { ...enrichment, error_message: "" };
  let saved = { ...workspace };
  await context.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());
    const table = pathname.split("/").at(-1);
    if (table === "is_admin") return route.fulfill({ json: admin });
    if (table === "get_workspace_admin_notes") return route.fulfill({ json: "" });
    if (table === "save_workspace_ai_review") {
      writes.push(`${request.method()} ${pathname}`);
      const payload = request.postDataJSON();
      expect(payload.applied_paths).toEqual(["description"]);
      expect(payload.patch.status).toBe("pending");
      saved = { ...saved, description: payload.patch.description };
      ai = { ...ai, status: "applied" };
      return route.fulfill({ json: null });
    }
    if (request.method() !== "GET") {
      writes.push(`${request.method()} ${pathname}`);
      return route.fulfill({ status: 400, json: { message: "Fixture prevents writes" } });
    }
    const json = table === "workspaces" ? searchParams.has("id") ? saved : [saved]
      : table === "workspace_ai_enrichments" ? [ai]
      : table === "workspace_photos" ? [{
        id: "photo", url: "/discovery/new-york-public-library.webp", caption: "Entrance", is_approved: null, is_primary: false,
      }]
      : table === "cities" ? [{ ...place.city, id: "zurich", featured: false, workspaces: [{ id: place.id, status: "pending" }] }]
      : [];
    await route.fulfill({ json });
  });
  await context.route("**/api/workspaces/**/enrich**", (route) => {
    writes.push(`${route.request().method()} enrichment`);
    return route.fulfill({ status: 400, json: { error: "Fixture prevents requests" } });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("fixture-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  return {
    writes,
    setAi: (status: string, error = "") => { ai = { ...ai, status, error_message: error }; },
  };
}

test.use({ viewport: { width: 390, height: 844 }, colorScheme: "dark", reducedMotion: "reduce" });
test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

test("the moderation queue filters by status and location without mutating data", async ({ page }, info) => {
  const { writes } = await mockAdmin(page, true);
  await page.goto("/admin/workspaces");
  const row = page.getByRole("link", { name: place.name });
  await expect(row).toBeVisible();
  await expect(page.getByRole("heading", { name: "Switzerland" })).toBeVisible();
  await expect(page.getByText("AI: Ready for review")).toBeVisible();
  await page.getByRole("combobox", { name: "Filter by AI status" }).click();
  await page.getByRole("option", { name: "Failed" }).click();
  await expect(page.getByText("No workspaces found")).toBeVisible();
  await page.getByRole("combobox", { name: "Filter by AI status" }).click();
  await page.getByRole("option", { name: "All AI" }).click();
  await page.getByRole("searchbox", { name: "Search places" }).fill("Zürich");
  await expect(row).toBeVisible();
  await page.screenshot({ path: info.outputPath("queue-mobile.png") });
  await page.getByRole("link", { name: "Cities" }).click();
  await expect(page.getByRole("heading", { name: "City management" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete empty" })).toBeDisabled();
  expect(writes).toEqual([]);
});

test("AI actions reflect active, failed and reviewable runs; confirmations do not write before save", async ({ page }, info) => {
  const { writes, setAi } = await mockAdmin(page, true);
  setAi("researching");
  await page.goto(editor);
  const panel = page.getByRole("region", { name: "AI review assist" });
  await expect(panel.getByText("Researching", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Running AI…" })).toBeDisabled();
  await expect(panel.getByRole("button", { name: "Run options" })).toBeDisabled();
  await expect(panel.getByRole("button", { name: "Apply", exact: true })).toHaveCount(0);
  setAi("failed", "ProviderError_".repeat(30));
  await expect(panel.getByText("The run did not finish. You can try again.")).toBeVisible({ timeout: 10_000 });
  await expect(panel.getByRole("button", { name: "Run again" })).toBeEnabled();
  await expect(panel.getByText(/^ProviderError_/)).toBeHidden();
  await panel.getByText("Technical details").click();
  await expect(panel.getByText(/^ProviderError_/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  setAi("ready_for_review");
  await page.reload();
  await expect(panel.getByText("Ready for review", { exact: true })).toBeVisible();
  for (const width of [320, 768, 1024, 1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width >= 768 ? "light" : "dark" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (width === 390 || width === 1440) await page.screenshot({ path: info.outputPath(`editor-${width}.png`) });
  }
  await panel.getByRole("combobox", { name: "Filter suggestions" }).click();
  await page.getByRole("option", { name: "High confidence", exact: true }).click();
  await expect(panel.getByRole("checkbox", { name: "Select Description" })).toHaveCount(0);
  await panel.getByRole("combobox", { name: "Filter suggestions" }).click();
  await page.getByRole("option", { name: "All suggestions", exact: true }).click();
  await panel.getByRole("checkbox", { name: "Select Description", exact: true }).check();
  await panel.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apply selected" }).click();
  await expect(page.getByRole("button", { name: "Save before preview" })).toBeDisabled();
  await expect(page.getByLabel("Full description")).toHaveValue("Proposed description");

  const photoActions = page.getByRole("button", { name: "Photo 1 actions" });
  await photoActions.click();
  await page.getByRole("menuitem", { name: "Delete photo" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(photoActions).toBeFocused();
  await page.getByRole("button", { name: "Delete place", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Delete this place?" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  expect(writes).toEqual([]);

  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(panel.getByText("Applied", { exact: true })).toBeVisible();
  await expect(panel.getByRole("checkbox", { name: "Select Description", exact: true })).toHaveCount(0);
  expect(writes).toEqual(["POST /rest/v1/rpc/save_workspace_ai_review"]);
  await expect(page.getByRole("button", { name: "Public after approval" })).toBeDisabled();
  const popup = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Admin preview" }).click();
  const preview = await popup;
  await expect(preview.getByText("Proposed description", { exact: true })).toBeVisible();
  await preview.screenshot({ path: info.outputPath("saved-preview-mobile.png") });
});

test("a signed-in non-admin still cannot see the moderation queue", async ({ page }) => {
  await mockAdmin(page, false);
  await page.goto("/admin/workspaces");
  await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search places" })).toHaveCount(0);
});

test("choosing approval without a pin still blocks save and keeps the preview private", async ({ page }) => {
  const { writes } = await mockAdmin(page, true, { ...place, latitude: null, longitude: null });
  await page.goto(editor);
  await page.getByRole("combobox", { name: "Workspace status" }).click();
  await page.getByRole("option", { name: "Approved", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Approved workspaces need a verified map location/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Public after approval" })).toBeDisabled();
  expect(writes).toEqual([]);
});
