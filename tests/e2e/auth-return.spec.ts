import { expect, test, type Page } from "@playwright/test";

const member = { id: "00f25ce5-a8b1-4e49-aee0-5258c65f243c", email: "test@example.com", aud: "authenticated", app_metadata: {}, user_metadata: {} };
const city = { id: "zurich", slug: "zurich", name: "Zurich", country: "Switzerland" };
const place = { id: "library", slug: "library", name: "Central Library", type: "library", address: "Zahringerplatz 6", latitude: 47.3732, longitude: 8.544, overall_rating: null };
const placePath = "/cities/zurich/library";

async function mockData(page: Page) {
  await page.route("**/auth/v1/token?**", (route) => {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const payload = Buffer.from(JSON.stringify({ exp: expiry, sub: member.id })).toString("base64url");
    return route.fulfill({ json: {
      access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`, refresh_token: "fixture",
      token_type: "bearer", expires_in: 3600, expires_at: expiry, user: member,
    } });
  });
  await page.route("**/rest/v1/**", (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    if (table === "is_admin") return route.fulfill({ json: false });
    if (route.request().method() !== "GET") return route.fulfill({ status: 400, json: { message: "Fixture prevents writes" } });
    return route.fulfill({ json: table === "cities" ? city : table === "workspaces" ? place : [] });
  });
}

async function signIn(page: Page) {
  const submit = page.getByRole("button", { name: "Sign in", exact: true });
  await expect(submit).toBeVisible();
  await page.getByLabel("Email").fill(member.email);
  await page.getByLabel("Password").fill("fixture-password");
  await submit.click();
}

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

test("a visitor can sign in and resume exactly the review they opened", async ({ page }) => {
  await mockData(page);
  await page.goto(placePath);
  await page.getByRole("button", { name: "Write review", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/signup\?redirect=/);
  await page.getByRole("link", { name: "Sign in", exact: true }).and(page.locator('a[href*="redirect="]')).click();
  await signIn(page);
  const form = page.locator("#write-review");
  await expect(form.getByRole("heading", { name: "Write a Review" })).toBeVisible();
  await expect(form).toBeFocused();
  await form.getByRole("button", { name: "4 stars", exact: true }).click();
  await form.getByLabel(/Your Review/).fill("Useful work spot");
  await page.reload();
  await page.getByRole("button", { name: "Write review", exact: true }).click();
  await expect(form.getByLabel(/Your Review/)).toHaveValue("Useful work spot");
  await expect(form.getByRole("button", { name: "4 stars", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("adding a place returns to the last draft step after sign-in", async ({ page }) => {
  await mockData(page);
  await page.addInitScript(({ userId, workspace }) => {
    const key = `lumen:add-place-draft:v1:${userId}`;
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      formData: { ...workspace, city_name: "Zurich", country: "Switzerland" },
      uploadedPhotos: [], workFactsVersion: 1, savedAt: new Date().toISOString(), currentStep: 4,
    }));
  }, { userId: member.id, workspace: place });
  await page.goto("/add-workspace");
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await signIn(page);
  await expect(page).toHaveURL(/\/add-workspace$/);
  await expect(page.getByText("Step 4 of 6", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText("Step 3 of 6", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate((id) =>
    JSON.parse(localStorage.getItem(`lumen:add-place-draft:v1:${id}`) ?? "{}").currentStep, member.id)).toBe(3);
  await page.goto("/login?redirect=%2Fadd-workspace");
  await expect(page.getByText("Step 3 of 6", { exact: true })).toBeVisible();
});

test("a visit report returns after sign-in, validates inline, and sends an observation for review", async ({ page }) => {
  await mockData(page);
  await page.route("**/rest/v1/rpc/submit_workspace_visit_observation", (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      workspace_uuid: place.id, doors: "closed", laptops: "unknown", stay: "unknown",
    });
    return route.fulfill({ json: "report-fixture" });
  });
  await page.goto(placePath);
  await page.getByText("Report a recent visit", { exact: true }).click();
  await page.getByRole("link", { name: "Sign in to report a visit" }).click();
  await signIn(page);
  await expect(page).toHaveURL(/#visit-observation$/);
  const form = page.locator("#visit-observation");
  const submit = form.getByRole("button", { name: "Send visit report" });
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("add at least one observation");
  await form.getByLabel("Were laptops allowed?").selectOption("allowed");
  await form.getByLabel("Was it open?").selectOption("closed");
  await expect(form.getByLabel("Were laptops allowed?")).toHaveCount(0);
  await submit.click();
  await expect(form.getByRole("status")).toContainText("Public information has not changed.");
});

test("session review queue is private and filters visit and closure work by reason and city", async ({ page }) => {
  await mockData(page);
  await page.route("**/rest/v1/rpc/list_workspace_session_review", (route) => route.fulfill({ json: [
    { workspace_id: "closure", name: "Old Cafe", city: "New York", reason: "closure_report", closure_reports: 1, visit_reports: 0 },
    { workspace_id: "visit", name: "Central Library", city: "Zurich", reason: "visit_report", closure_reports: 0, visit_reports: 1 },
    { workspace_id: "draft", name: "Corner Cafe", city: "New York", reason: "draft", closure_reports: 0, visit_reports: 0 },
  ] }));
  await page.goto("/admin/workspaces/session-review");
  await expect(page.getByText("You need moderator access to view this queue.")).toBeVisible();
  await page.goto("/login?redirect=%2Fadd-workspace");
  await signIn(page);
  await expect(page).toHaveURL(/\/add-workspace$/);
  await page.goto("/admin/workspaces/session-review");
  const list = page.getByRole("list", { name: "Places awaiting session review" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await page.getByLabel("City", { exact: true }).selectOption("New York");
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await page.getByLabel("Review reason").selectOption("closure_report");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list.getByRole("link", { name: "Review", exact: true })).toHaveAttribute("href", "/admin/workspaces/closure#place-reports");
  await page.getByLabel("Review reason").selectOption("visit_report");
  await expect(page.getByRole("status")).toHaveText("No places need review for these filters.");
});
