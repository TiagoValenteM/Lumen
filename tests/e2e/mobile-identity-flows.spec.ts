import { expect, test, type Page } from "@playwright/test";

const placePath = "/cities/zurich/fixture-library";
const placeName = "Central Library for Research and International Remote Working";
const photoUrl = "/discovery/new-york-public-library.webp";
const person = {
  id: "b74c506f-07e5-4743-a39b-82feea038af1", aud: "authenticated", role: "authenticated",
  email: "test@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T09:00:00Z",
};

async function mockData(page: Page) {
  await page.route("**/auth/v1/token?**", async (route) => {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const jwt = Buffer.from(JSON.stringify({ exp: expiry, sub: person.id })).toString("base64url");
    await route.fulfill({ json: {
      access_token: `eyJhbGciOiJIUzI1NiJ9.${jwt}.fixture`,
      refresh_token: "fixture", token_type: "bearer", expires_in: 3600, expires_at: expiry, user: person,
    } });
  });

  await page.route("**/rest/v1/**", async (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    const json = table === "cities" ? { id: "zurich", slug: "zurich", name: "Zürich", country: "Switzerland" }
      : table === "workspaces" ? {
        id: "library", name: placeName, type: "library", short_description: null, description: null,
        address: "Zähringerplatz 6, Zürich", latitude: 47.3732, longitude: 8.5440,
        overall_rating: null, laptop_friendly: true, has_wifi: null, time_limit_hours: null,
      }
      : table === "workspace_photos" ? [
        { id: "front", url: photoUrl, caption: "Main entrance", is_primary: true },
        { id: "side", url: photoUrl, caption: "Side entrance", is_primary: false },
      ]
      : table === "is_admin" ? false : [];
    if (route.request().method() !== "GET" && table !== "is_admin") {
      await route.fulfill({ status: 500, json: { message: "Fixture write rejected" } });
      return;
    }
    await route.fulfill({ json });
  });
}

async function signIn(page: Page) {
  await page.getByLabel("Email").fill(person.email);
  await page.getByLabel("Password").fill("fixture-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.use({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
  launchOptions: { args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
});
test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

test("place directions, gallery and review return path work on mobile", async ({ page }) => {
  await mockData(page);
  await page.goto(placePath);
  await expect(page.getByRole("heading", { name: placeName })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get directions" })).toHaveAttribute("href", /47\.3732/);
  await page.getByRole("button", { name: "Show next photo" }).click();
  const image = page.getByRole("img", { name: "Side entrance" });
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Write review", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/legal/terms");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Write a Review" })).toBeVisible();
  await expect(page.locator("#write-review")).toBeFocused();
  await page.getByRole("button", { name: "4 stars" }).click();
  await expect(page.getByRole("button", { name: "4 stars" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Submit Review" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not save your review." })).toBeVisible();
});

test("add-place validation waits for Next and the chosen address survives a reload", async ({ page }) => {
  await mockData(page);
  await page.route("**/api/geocode/search?**", (route) => route.fulfill({ json: { results: [{
    id: "location-fixture", label: "Central Library", address: "Zähringerplatz 6", city: "Zürich", country: "Switzerland",
    latitude: 47.3732, longitude: 8.5440, provider: "photon", providerId: "fixture", confidence: null, raw: null,
  }] } }));
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({
    json: { version: 8, sources: {}, layers: [{ id: "ground", type: "background", paint: { "background-color": "#ccdccc" } }] },
  }));
  await page.route("**/api/geocode/reverse?**", (route) => route.fulfill({
    json: { address: "Zähringerplatz 8", city: "Zürich", country: "Switzerland", provider: "photon" },
  }));

  await page.goto("/add-workspace");
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await signIn(page);
  const location = page.getByLabel("Find the place");
  await expect(location).toBeVisible();
  await expect(location).toHaveAttribute("aria-invalid", "false");
  await expect(page.locator(".maplibregl-canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(location).toBeFocused();
  await expect(page.getByRole("alert").filter({ hasText: "Select a search result" })).toBeVisible();
  await location.fill("Central Library");
  await page.getByRole("button", { name: /Central Library.*Zürich/ }).click();
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue("Zähringerplatz 6");
  await expect(page.getByRole("button", { name: "Adjust pin" })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Adjust pin" }).click();
  await expect(page.getByText("Loading map…")).toBeHidden();
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 100, y: 90 } });
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue("Zähringerplatz 8");
  await page.getByRole("button", { name: "Hide map" }).click();
  await expect(canvas).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Adjust pin" })).toBeFocused();
  await page.getByLabel("Place name").fill("Central Library");
  await expect.poll(() => page.evaluate((id) => {
    const draft = localStorage.getItem(`lumen:add-place-draft:v1:${id}`);
    return draft ? JSON.parse(draft).formData.name : null;
  }, person.id)).toBe("Central Library");
  await expect(page.getByText(/Draft saved/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Place name")).toHaveValue("Central Library");
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue("Zähringerplatz 8");
  await expect(page.getByLabel("Country")).toHaveValue("Switzerland");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Step 2 of 6")).toBeVisible();
  await expect(page.locator("#add-place-progress")).toBeFocused();
});
