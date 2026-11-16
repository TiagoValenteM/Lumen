import { expect, test } from "@playwright/test";

test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

test("the old Lisboa workspace link survives both sides of the city merge", async ({ page }) => {
  let merged = false;
  await page.route("**/rest/v1/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/cities")) {
      if (url.searchParams.get("slug") === "eq.lisboa-portugal") return route.fulfill({ json: merged ? null : { id: "legacy" } });
      return route.fulfill({ json: { id: "canonical", slug: "lisbon", name: "Lisboa", country: "Portugal" } });
    }
    if (url.pathname.endsWith("/workspaces")) {
      return route.fulfill({ json: url.searchParams.get("city_id") === (merged ? "eq.canonical" : "eq.legacy")
        ? { id: "santos", slug: "santos", name: "Santos Cafe", type: "cafe", address: "Santos, Lisboa",
          latitude: 38.70, longitude: -9.15, overall_rating: null, productivity_rating: null, comfort_rating: null }
        : null });
    }
    return route.fulfill({ json: [] });
  });
  const old = "/cities/lisboa-portugal/santos?ref=saved#visit-observation";
  for (const phase of [false, true]) {
    merged = phase;
    await page.goto(old);
    await expect(page).toHaveURL(/\/cities\/lisbon\/santos\?ref=saved#visit-observation$/);
    await expect(page.getByRole("heading", { name: "Santos Cafe", exact: true })).toBeVisible();
  }
});

test("shared Find a Spot links still select Lisboa without dropping their settings", async ({ page }) => {
  await page.route("**/rest/v1/**", (route) => route.fulfill({ json: route.request().url().includes("/cities?")
    ? [{ id: "canonical", slug: "lisbon", name: "Lisboa", country: "Portugal" }]
    : [] }));
  await page.goto("/find?city=lisboa-portugal&minutes=60&wifi=1");
  await expect(page.getByRole("link", { name: "Browse Lisboa" })).toHaveAttribute("href", "/cities/lisbon");
  await expect(page.locator("select").first()).toHaveValue("lisbon");
  await expect(page).toHaveURL(/minutes=60&wifi=1$/);
});
