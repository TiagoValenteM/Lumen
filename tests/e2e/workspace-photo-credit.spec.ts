import { expect, test } from "@playwright/test";

test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

for (const venue of [
  { name: "Café du Bonheur", slug: "cafe-du-bonheur-zurich", type: "cafe",
    photo: "zurich-bullingerplatz-roland-fischer.jpg", caption: "Terrace across Bullingerplatz",
    source: /143911\.jpg$/, fit: "object-cover" },
  { name: "Westhive Zürich Hardturm", slug: "westhive-hardturm-zurich", type: "coworking",
    photo: "zurich-hardturmstrasse-161-tschubby.jpg", caption: "Street entrance to Hardturmstrasse 161",
    source: /Hardturmstrasse_161\.JPG$/, fit: "object-contain" },
]) test(`${venue.name} photo loads with its visible source and license`, async ({ page }) => {
  const city = { id: "zurich", slug: "zurich", name: "Zürich", country: "Switzerland" };
  const workspace = { id: venue.slug, name: venue.name, slug: venue.slug, type: venue.type,
    latitude: 47.38, longitude: 8.52, overall_rating: null };
  await page.route("**/rest/v1/**", (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    return route.fulfill({ json: table === "cities" ? city : table === "workspaces" ? workspace
      : table === "workspace_photos" ? [{ id: "photo", url: `/images/${venue.photo}`,
        caption: venue.caption, is_primary: true }] : [] });
  });
  await page.goto(`/cities/zurich/${venue.slug}`);
  const photo = page.getByRole("img", { name: venue.caption });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  await expect(photo).toHaveClass(new RegExp(venue.fit));
  await expect(page.getByRole("link", { name: "CC BY-SA 3.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/3.0/");
  await expect(page.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", venue.source);
  await expect(page.getByText("Productivity", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Amenities", { exact: true })).toHaveCount(0);
});
