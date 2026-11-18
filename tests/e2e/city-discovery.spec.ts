import { expect, test, type Page } from "@playwright/test";

const city = { id: "test-city", slug: "test-city", name: "Test City", country: "Switzerland", workspace_count: 2 };
const places = [
  { id: "far", name: "Far Cafe", slug: "far", type: "cafe", latitude: 48, longitude: 8,
    overall_rating: 5, total_reviews: 2, has_parking: false, laptop_friendly: true, noise_level: "quiet", created_at: "2026-11-01" },
  { id: "near", name: "Near Cafe", slug: "near", type: "cafe", latitude: 47, longitude: 8,
    overall_rating: 4, total_reviews: 1, has_parking: false, laptop_friendly: true, created_at: "2026-11-01" },
];

async function directory(page: Page, rows = places) {
  await page.route("**/rest/v1/**", (route) => {
    if (route.request().method() !== "GET") return route.fulfill({ status: 405 });
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    return route.fulfill({ json: table === "cities" ? city : table === "workspaces" ? rows : [] });
  });
  await page.goto(`/cities/${city.slug}`);
  await expect(page.getByRole("heading", { name: city.name, exact: true })).toBeVisible();
}

test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");
test.use({ reducedMotion: "reduce" });

test("city discovery and the scroll frame fit phone, tablet, desktop and landscape", async ({ page }) => {
  await directory(page);
  for (const viewport of [
    { width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 },
    { width: 1024, height: 768 }, { width: 1440, height: 900 }, { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const frame = await page.evaluate(() => {
      const nav = document.querySelector("nav")!.getBoundingClientRect();
      const root = document.querySelector("#root-content")!.getBoundingClientRect();
      return { navBottom: nav.bottom, rootTop: root.top, rootBottom: root.bottom, bodyHeight: document.body.scrollHeight };
    });
    expect(frame.rootTop).toBe(frame.navBottom);
    expect(frame.rootBottom).toBe(viewport.height);
    expect(frame.bodyHeight).toBe(viewport.height);
    const near = await page.getByRole("button", { name: "Near me", exact: true }).boundingBox();
    expect(near!.x + near!.width).toBeLessThanOrEqual(viewport.width);
    if (viewport.width < 640) {
      const metric = await page.getByRole("button", { name: /^Quiet picks/ }).boundingBox();
      expect(metric!.height).toBeLessThanOrEqual(56);
    }
  }
});

test("no filter matches is not an empty city and offers recovery and the real add route", async ({ page }) => {
  await directory(page);
  await page.getByRole("button", { name: "Show filters", exact: true }).click();
  await page.getByRole("button", { name: "Parking", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No places match these filters", exact: true })).toBeVisible();
  await expect(page.getByText("No workspaces yet", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add a place", exact: true })).toHaveAttribute("href", "/add-workspace");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByRole("link").filter({ hasText: "Far Cafe" })).toBeVisible();
  await page.getByRole("button", { name: "Parking", exact: true }).click();
  await page.getByRole("link", { name: "Add a place", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadd-workspace$/);
});

test("an actually empty city links to adding its first place", async ({ page }) => {
  await directory(page, []);
  await expect(page.getByRole("heading", { name: "No workspaces yet", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear filters", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add a place", exact: true })).toHaveAttribute("href", "/add-workspace");
});

test("near me requests location on click and sorts only after permission succeeds", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 47, longitude: 8 });
  await directory(page);
  const cards = page.locator('a[href^="/cities/test-city/"]');
  await expect(cards.first()).toContainText("Far Cafe");
  await expect(page.getByRole("button", { name: "Near me", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Near me", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Sort places", exact: true })).toContainText("Closest");
  await expect(cards.first()).toContainText("Near Cafe");
});

test("denied location explains the failure and leaves city browsing and retry available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { value: {
      getCurrentPosition(_success: PositionCallback, fail: PositionErrorCallback) {
        fail({ code: 1, message: "Denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
      },
    } });
  });
  await directory(page);
  await page.getByRole("button", { name: "Near me", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Location access denied" })).toContainText("browse this city");
  await expect(page.getByRole("button", { name: "Near me", exact: true })).toBeEnabled();
  await expect(page.getByRole("link").filter({ hasText: "Far Cafe" })).toBeVisible();
});

test("a browser location error does not leave the request stuck or change the sort", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { value: {
      getCurrentPosition() { throw new Error("Location API unavailable"); },
    } });
  });
  await directory(page);
  await page.getByRole("button", { name: "Near me", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Unable to retrieve your location" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Near me", exact: true })).toBeEnabled();
  await expect(page.getByRole("combobox", { name: "Sort places", exact: true })).toContainText("Best rated");
});
