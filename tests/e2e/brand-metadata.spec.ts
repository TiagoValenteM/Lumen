import { expect, test } from "@playwright/test";
import { BRAND_NAME } from "../../lib/constants/brand";

test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

test("the original brand has consistent tabs, icons and share metadata", async ({ page, request, baseURL }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(`${BRAND_NAME} | Work-friendly places`);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", BRAND_NAME);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /Deskhaunt/);
  const image = new URL((await page.locator('meta[property="og:image"]').getAttribute("content"))!);
  expect(["http:", "https:"]).toContain(image.protocol);
  const homeUrl = (await page.locator('meta[property="og:url"]').getAttribute("content"))!;
  expect(new URL(homeUrl).href).toBe(new URL("/", image.origin).href);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", image.href);

  const icon = (await page.locator('link[rel="icon"][type="image/png"]').getAttribute("href"))!;
  const appleIcon = (await page.locator('link[rel="apple-touch-icon"]').getAttribute("href"))!;
  for (const [path, type] of [[image.pathname, /image\/png/], [icon, /image\/png/], [appleIcon, /image\/png/], ["/favicon.ico", /image\//]] as const) {
    const response = await request.get(new URL(path, baseURL).href);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toMatch(type);
  }

  await page.goto("/find?city=new-york-united-states&wifi=1");
  await expect(page).toHaveTitle(`Find a Spot | ${BRAND_NAME}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new URL("/find", image.origin).href);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", `Find a Spot | ${BRAND_NAME}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image.href);
  await page.goto("/legal/privacy");
  await expect(page).toHaveTitle(`Privacy Policy | ${BRAND_NAME}`);
  await expect(page.getByRole("link", { name: "support@lumen.com" })).toHaveAttribute("href", "mailto:support@lumen.com");
});
