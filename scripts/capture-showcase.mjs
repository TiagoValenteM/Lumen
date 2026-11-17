import { chromium, expect } from "@playwright/test";

const origin = "https://lumen-lime.vercel.app";
const city = "z-rich-schweiz-suisse-svizzera-svizra";
const session = process.argv[2];
if (!session || !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(session) || Date.parse(session) <= Date.now()) {
  throw new Error("Pass a future UTC session, e.g. pnpm showcase:capture 2026-11-23T10:00Z.");
}
const finder = `${origin}/find?${new URLSearchParams({ city, session })}`;
const browser = await chromium.launch();
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "Europe/Zurich", reducedMotion: "reduce" });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true,
    hasTouch: true, timezoneId: "Europe/Zurich", reducedMotion: "reduce" });
  for (const context of [desktop, mobile]) {
    await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method())
      ? route.continue() : route.abort());
  }

  const finderPage = await desktop.newPage();
  await finderPage.goto(finder);
  await expect(finderPage.getByRole("list", { name: "Matching places" }).getByRole("link", { name: "Büro Züri", exact: true })).toBeVisible();
  await finderPage.getByRole("button", { name: "Map", exact: true }).click();
  await expect(finderPage.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(finderPage.getByRole("button", { name: /Westhive/ }).first()).toBeVisible();
  await finderPage.screenshot({ path: "docs/showcase/find-a-spot.png", animations: "disabled" });

  const mobilePage = await mobile.newPage();
  await mobilePage.goto(finder);
  await expect(mobilePage.getByRole("list", { name: "Matching places" })).toBeVisible();
  await mobilePage.locator("summary").filter({ hasText: "Filters" }).click();
  await expect(mobilePage.getByRole("checkbox", { name: "Open for my session" })).toBeChecked();
  await mobilePage.screenshot({ path: "docs/showcase/session-filters-mobile.png", animations: "disabled" });

  await finderPage.setViewportSize({ width: 1440, height: 760 });
  await finderPage.goto(`${origin}/cities/${city}/cafe-du-bonheur-zurich`);
  await expect(finderPage.getByRole("heading", { name: "Café du Bonheur", exact: true })).toBeVisible();
  await expect(finderPage.getByText(/Photo: Roland Fischer/)).toBeVisible();
  const photo = finderPage.getByRole("img", { name: /terrace across Bullingerplatz/ });
  await expect.poll(() => photo.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
  await finderPage.screenshot({ path: "docs/showcase/workspace-detail.png", animations: "disabled" });
  await finderPage.getByRole("region", { name: "Photos" }).screenshot({
    path: "docs/showcase/workspace-photo.png", animations: "disabled",
  });
} finally {
  await browser.close();
}
