import { expect, test } from "@playwright/test";

const city = { id: "ny", slug: "new-york-united-states", name: "New York", country: "United States" };
const fiction = {
  id: "54f3915e-e27b-4927-94c8-afeaaa023956", slug: "fiction-bar-cafe-new-york", name: "Fiction Bar/Cafe", type: "cafe",
  address: "308 Hooper Street, Brooklyn, New York, New York, 11211", latitude: 40.70732, longitude: -73.95372,
  laptop_friendly: true, time_limit_hours: null, workspace_photos: [],
};
const unknown = { ...fiction, id: "unknown", slug: "unknown", name: "Unverified Cafe", address: "Somewhere else" };
const policy = {
  source: "https://fictionbk.com/about", coverageSource: "https://fictionbk.com/events",
  exceptionsCheckedThrough: "2026-11-22", exceptions: {},
  weekly: { Mon: [[0, 120], [420, 1440]], Tue: [[0, 120], [420, 1440]], Wed: [[0, 120], [420, 1440]] },
};

test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");
test.use({ timezoneId: "Europe/Zurich", viewport: { width: 320, height: 800 } });

test("the session filter verifies a scheduled overnight visit without promoting unknown hours", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-16T21:30Z"));
  await page.route("**/rest/v1/**", (route) => {
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    return route.fulfill({ json: table === "cities" ? [city] : table === "workspaces" ? [fiction, unknown]
      : table === "workspace_session_hours" ? [{ workspace_id: fiction.id, checked_at: "2026-11-16T21:00Z",
        published: { timeZone: "America/New_York", note: "Two-hour limit", opening: policy, laptopAccess: { ...policy, maxSessionMinutes: 120 } } }]
      : [] });
  });
  await page.goto(`/find?city=${city.slug}`);
  const disclosure = page.locator("summary").filter({ hasText: "Filters" });
  await disclosure.focus();
  await page.keyboard.press("Enter");
  const checkbox = page.getByRole("checkbox", { name: "Open for my session" });
  await checkbox.click();
  await expect(page).toHaveURL(/session=now$/);
  await expect(checkbox).toBeChecked();
  const matches = page.getByRole("list", { name: "Matching places" });
  const details = page.getByRole("list", { name: "Places with details to check" });
  await expect(matches.getByRole("link", { name: fiction.name, exact: true })).toBeVisible();
  await expect(details.getByRole("link", { name: unknown.name, exact: true })).toBeVisible();

  await page.getByLabel(/your local time/).fill("2026-11-18T05:00");
  await page.getByRole("button", { name: "Set start", exact: true }).click();
  await expect(page).toHaveURL(/session=2026-11-18T04%3A00Z$/);
  await expect(matches.getByRole("link", { name: "Venue hours and laptop policy" })).toHaveAttribute("href", "https://fictionbk.com/about");
  await page.getByText("3 h", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "3 hours" })).toBeChecked();
  await expect(page.getByRole("link", { name: fiction.name, exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(matches.getByRole("link", { name: fiction.name, exact: true })).toBeVisible();

  await page.getByLabel(/your local time/).fill("2026-11-26T16:00");
  await page.getByRole("button", { name: "Set start", exact: true }).click();
  await expect(details.getByRole("link", { name: fiction.name, exact: true })).toBeVisible();
  await expect(matches).toHaveCount(0);
  await expect(details.getByText("Opening hours not checked for this date")).toBeVisible();
  await expect(details.getByText("Laptop access not checked for this date")).toBeVisible();
  await expect(details.getByText("Opening hours not verified")).toBeVisible();
  await expect(details.getByText("Laptop access not verified")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

  await page.getByLabel(/your local time/).fill("2026-11-15T10:00");
  await page.getByRole("button", { name: "Set start", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choose an unambiguous date and time after now." })).toBeVisible();
  await page.getByRole("button", { name: "Search without session hours" }).click();
  await expect(checkbox).not.toBeChecked();
  await expect(page).not.toHaveURL(/session=/);
});
