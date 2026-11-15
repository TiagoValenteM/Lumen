import { expect, test } from "@playwright/test";

const city = { id: "city-ny", slug: "new-york-united-states", name: "New York", country: "United States" };
const place = {
  id: "library-ny", slug: "new-york-public-library", name: "New York Public Library",
  type: "library", address: "Fifth Avenue, Manhattan", latitude: 40.7533, longitude: -73.9822,
  laptop_friendly: true, time_limit_hours: null, has_wifi: null, has_power_outlets: null,
  noise_level: null, good_for_calls: null, workspace_photos: [],
};

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

test("the home leads to discovery and the mobile finder keeps results near the filters", async ({ page }) => {
  await page.route("**/rest/v1/**", async (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    const json = table === "cities" ? [city] : table === "workspaces" ? [place] : [];
    await route.fulfill({ json });
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Deskhaunt home" })).toBeVisible();
  const heroPhoto = page.getByRole("img", { name: /New York Public Library/ });
  await expect.poll(() => heroPhoto.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Find a Spot", exact: true }).click();
  await page.getByRole("combobox", { name: "City" }).selectOption(city.slug);

  const summary = page.locator("summary");
  await expect(summary).toContainText("Work · 2 h");
  await expect(page.getByRole("checkbox", { name: "Wi-Fi" })).toBeHidden();
  await expect(page.getByText("No confirmed matches.", { exact: false })).toBeVisible();
  const result = page.getByRole("link", { name: place.name, exact: true });
  await expect(result).toBeVisible();
  await expect.poll(async () => (await result.boundingBox())?.y ?? Infinity).toBeLessThan(570);
  await expect(page.locator(".maplibregl-canvas")).toHaveCount(0);

  const ask = page.getByRole("textbox", { name: "What kind of spot do you need?" });
  await ask.fill("Somewhere quiet for two hours, with Wi-Fi");
  await ask.press("Enter");
  await expect(summary).toContainText("Focus · 2 h · Wi-Fi");
  await expect(page).toHaveURL(/activity=focus.*wifi=1/);
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("checkbox", { name: "Wi-Fi" })).toBeChecked();
  const outlets = page.getByRole("checkbox", { name: "Outlets" });
  await outlets.click();
  await expect(outlets).toBeChecked();
  await expect(summary).toContainText("Outlets");
  await expect(page).toHaveURL(/wifi=1.*power=1/);
  await expect(result).toBeVisible();
});
