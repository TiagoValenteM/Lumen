import { expect, test } from "@playwright/test";

test.skip(!process.env.LUMEN_E2E_BASE_URL, "Set LUMEN_E2E_BASE_URL to a running app.");

test("public footer leads to readable legal pages and a private contact", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await footer.getByRole("link", { name: "Terms", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Legal and support" });
  await nav.getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveTitle("Privacy Policy | Lumen");
  await expect(nav.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Contact page", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
  const email = page.locator('main a[href^="mailto:"]');
  await expect(email).toHaveAttribute("href", /^mailto:[^\s@]+@[^\s@]+$/);
  await expect(email).not.toHaveAttribute("href", "mailto:support@lumen.com");
  await expect(page.getByRole("link", { name: "find the place in the directory" })).toHaveAttribute("href", "/cities");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("sign-in and sign-up link to the real terms and privacy policy", async ({ page }) => {
  for (const path of ["/login", "/signup"]) {
    await page.goto(path);
    await page.getByRole("link", { name: "Terms", exact: true }).click();
    await expect(page).toHaveURL(/\/legal\/terms$/);
    await page.goBack();
    await page.getByRole("link", { name: "Privacy Policy", exact: true }).click();
    await expect(page).toHaveURL(/\/legal\/privacy$/);
  }
});
