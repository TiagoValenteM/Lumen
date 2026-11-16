import { expect, test } from "@playwright/test";

test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

test("the curated venue photo loads with its visible source and license", async ({ page }) => {
  const city = { id: "zurich", slug: "zurich", name: "Zürich", country: "Switzerland" };
  const workspace = { id: "bonheur", name: "Café du Bonheur", slug: "cafe-du-bonheur-zurich", type: "cafe",
    address: "Zypressenstrasse 115", latitude: 47.38, longitude: 8.52, overall_rating: null };
  await page.route("**/rest/v1/**", (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    return route.fulfill({ json: table === "cities" ? city : table === "workspaces" ? workspace
      : table === "workspace_photos" ? [{ id: "photo", url: "/images/zurich-bullingerplatz-roland-fischer.jpg",
        caption: "Terrace across Bullingerplatz", is_primary: true }] : [] });
  });
  await page.goto("/cities/zurich/cafe-du-bonheur-zurich");
  const photo = page.getByRole("img", { name: "Terrace across Bullingerplatz" });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: "CC BY-SA 3.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/3.0/");
  await expect(page.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", /143911\.jpg$/);
});
