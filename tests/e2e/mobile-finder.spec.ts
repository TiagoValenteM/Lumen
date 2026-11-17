import { expect, test, type Page } from "@playwright/test";

const city = { id: "ny", slug: "new-york-united-states", name: "New York", country: "United States" };
const place = {
  id: "library", slug: "public-library", name: "New York Public Library", type: "library",
  address: "476 Fifth Avenue, Manhattan", latitude: 40.7533, longitude: -73.9822,
  laptop_friendly: true, time_limit_hours: null, has_wifi: null, has_power_outlets: null,
  noise_level: null, good_for_calls: null, workspace_photos: [],
};
const confirmed = { ...place, time_limit_hours: 3, has_wifi: true, noise_level: "quiet" };

async function mockDirectory(page: Page, isConfirmed: boolean) {
  await page.route("**/rest/v1/**", (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    const json = table === "cities" ? [city]
      : table === "workspaces" ? [isConfirmed ? confirmed : place]
      : table === "workspace_work_fact_checks" && isConfirmed
        ? [{ workspace_id: place.id, checked_at: new Date().toISOString() }] : [];
    return route.fulfill({ json });
  });
}

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

test("mobile results appear early, and filters and map open on demand", async ({ page }) => {
  await mockDirectory(page, false);
  await page.goto("/find");
  await expect(page.getByRole("link", { name: "Lumen", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "City" }).selectOption(city.slug);
  const filters = page.locator("summary").filter({ hasText: "Filters" });
  const wifi = page.getByRole("checkbox", { name: "Wi-Fi" });
  await expect(filters).toContainText("Work · 2 h");
  await expect(wifi).toBeHidden();
  await expect(page.getByRole("heading", { name: "Places to check" })).toBeVisible();
  await expect(page.getByText("No confirmed matches.")).toBeVisible();
  const placeLink = page.getByRole("link", { name: place.name, exact: true });
  await expect(placeLink).toBeVisible();
  await expect.poll(async () => (await placeLink.boundingBox())?.y ?? Infinity).toBeLessThan(500);
  await expect(page.locator("#spot-results-map")).toHaveCount(0);

  const request = page.getByRole("textbox", { name: "What kind of spot do you need?" });
  await request.fill("Somewhere quiet for two hours, with Wi-Fi");
  await page.getByRole("button", { name: "Set filters" }).click();
  await expect(filters).toContainText("Focus · 2 h · Wi-Fi");
  await expect(page).toHaveURL(/activity=focus.*wifi=1/);
  await filters.focus();
  await page.keyboard.press("Enter");
  await expect(wifi).toBeChecked();
  const outlets = page.getByRole("checkbox", { name: "Outlets" });
  await outlets.click();
  await expect(outlets).toBeChecked();
  await expect(filters).toContainText("Outlets");
  await expect(page).toHaveURL(/wifi=1.*power=1/);
  await page.goBack();
  await expect(outlets).not.toBeChecked();
  await expect(wifi).toBeChecked();
  await filters.click();

  const map = page.getByRole("button", { name: "Map", exact: true });
  await map.click();
  const hide = page.getByRole("button", { name: "Hide map" });
  await expect(hide).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#spot-results-map")).toBeVisible();
  await hide.click();
  await expect(page.locator("#spot-results-map")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("shared filters still show checked matches without mixing them with uncertain places", async ({ page }) => {
  await mockDirectory(page, true);
  await page.goto(`/find?city=${city.slug}&activity=focus&wifi=1`);
  await expect(page.locator("summary").filter({ hasText: "Filters" })).toContainText("Focus · 2 h · Wi-Fi");
  await expect(page.getByRole("heading", { name: "Matches", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Matching places" }).getByRole("link", { name: place.name, exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Places with details to check" })).toHaveCount(0);
});

test("desktop results show curated images and fall back when a photo cannot load", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const photoUrl = "/images/zurich-bullingerplatz-roland-fischer.jpg";
  await page.route("**/rest/v1/**", (route) => {
    const url = new URL(route.request().url());
    const rows = url.pathname.endsWith("/cities") ? [city] : url.pathname.endsWith("/workspaces") ? [
      { ...place, workspace_photos: [{ url: photoUrl, is_primary: true, is_approved: true }] },
      { ...place, id: "missing-photo", name: "Place with no image file",
        workspace_photos: [{ url: "/images/missing-test-photo.jpg", is_primary: true, is_approved: true }] },
    ] : [];
    return route.fulfill({ json: rows });
  });
  await page.route("**/images/missing-test-photo.jpg", (route) => route.fulfill({ status: 404 }));
  await page.goto(`/find?city=${city.slug}`);
  const picture = page.locator(`img[src$="${photoUrl}"]`);
  await expect(picture).toBeVisible();
  await expect.poll(() => picture.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  const missing = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Place with no image file" }) });
  await expect(missing.locator("img")).toHaveCount(0);
  await expect(missing.locator("svg.lucide-landmark")).toBeVisible();
});
