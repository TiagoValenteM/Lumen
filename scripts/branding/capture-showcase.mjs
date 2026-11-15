import { chromium, webkit } from "@playwright/test";

const site = process.env.LUMEN_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const output = new URL("../../docs/showcase/", import.meta.url);

const desktop = await chromium.launch({ args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await desktop.newPage({ viewport: { width: 1360, height: 1010 }, colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(new URL("/find?city=new-york-united-states", site).href);
  await page.getByRole("heading", { name: "Find a Spot", exact: true }).waitFor();
  const ask = page.getByRole("textbox", { name: "What kind of spot do you need?" });
  await ask.fill("Somewhere quiet for two hours, with Wi-Fi");
  await ask.press("Enter");
  await page.locator("summary").filter({ hasText: /Focus.*Wi-Fi/ }).waitFor();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.locator(".maplibregl-canvas").waitFor();
  await page.locator(".maplibregl-marker").first().waitFor();
  await page.getByText("OpenStreetMap", { exact: true }).first().waitFor();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: new URL("find-a-spot.png", output).pathname, animations: "disabled", style: "nextjs-portal { display: none !important; }" });
} finally {
  await desktop.close();
}

const mobile = await webkit.launch();
try {
  const page = await mobile.newPage({ viewport: { width: 390, height: 844 }, colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto(new URL("/", site).href);
  await page.getByRole("link", { name: "Deskhaunt home" }).waitFor();
  await page.getByRole("img", { name: /Stone arches/ }).evaluate((image) => image.decode());
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: new URL("home-mobile.png", output).pathname, style: "nextjs-portal { display: none !important; }" });
  await page.getByRole("link", { name: "New York Public Library" }).click();
  await page.getByRole("link", { name: "Get directions" }).waitFor();
  await page.screenshot({ path: new URL("place-mobile.png", output).pathname, style: "nextjs-portal { display: none !important; }" });
} finally {
  await mobile.close();
}
