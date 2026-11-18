import { defineConfig } from "@playwright/test";

const baseURL = process.env.LUMEN_E2E_BASE_URL;
const localURL = "http://127.0.0.1:3171";
const startServer = process.env.LUMEN_E2E_START_SERVER === "1";
const fixtureURL = "http://127.0.0.1:3172";
const stagingServer = process.env.LUMEN_E2E_START_STAGING === "1";
if (stagingServer && (startServer || baseURL !== "http://127.0.0.1:3173" ||
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" || process.env.LUMEN_E2E_ALLOW_WRITES !== "staging")) {
  throw new Error("Disposable staging accepts only its loopback app and database.");
}
if (startServer && (baseURL !== localURL || process.env.NEXT_PUBLIC_SUPABASE_URL !== fixtureURL ||
  process.env.LUMEN_E2E_ALLOW_WRITES)) {
  throw new Error(`Managed E2E requires ${localURL}, the Supabase fixture at ${fixtureURL}, and no staging writes.`);
}

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL, trace: startServer ? "retain-on-failure" : "off",
    connectOptions: process.env.LUMEN_E2E_BROWSER_WS_ENDPOINT ? { wsEndpoint: process.env.LUMEN_E2E_BROWSER_WS_ENDPOINT } : undefined,
    screenshot: stagingServer ? "only-on-failure" : "off" },
  forbidOnly: Boolean(process.env.CI),
  webServer: startServer ? [{
    command: "node tests/support/auth-fixture-server.mjs",
    url: `${fixtureURL}/health`,
    reuseExistingServer: false,
  }, {
    command: "pnpm start --hostname 127.0.0.1 --port 3171",
    url: localURL,
    reuseExistingServer: false,
  }] : stagingServer ? {
    command: "pnpm start --hostname 127.0.0.1 --port 3173",
    url: "http://127.0.0.1:3173",
    reuseExistingServer: false,
  } : undefined,
  timeout: 60_000,
  reporter: "list",
});
