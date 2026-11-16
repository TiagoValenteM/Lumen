import { defineConfig } from "@playwright/test";

const baseURL = process.env.LUMEN_E2E_BASE_URL;
const localURL = "http://127.0.0.1:3171";
const startServer = process.env.LUMEN_E2E_START_SERVER === "1";
const fixtureURL = "http://127.0.0.1:3172";
if (startServer && (baseURL !== localURL || process.env.NEXT_PUBLIC_SUPABASE_URL !== fixtureURL ||
  process.env.LUMEN_E2E_ALLOW_WRITES)) {
  throw new Error(`Managed E2E requires ${localURL}, the Supabase fixture at ${fixtureURL}, and no staging writes.`);
}

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL, trace: startServer ? "retain-on-failure" : "off" },
  forbidOnly: Boolean(process.env.CI),
  webServer: startServer ? [{
    command: "node tests/support/auth-fixture-server.mjs",
    url: `${fixtureURL}/health`,
    reuseExistingServer: false,
  }, {
    command: "pnpm start --hostname 127.0.0.1 --port 3171",
    url: localURL,
    reuseExistingServer: false,
  }] : undefined,
  timeout: 60_000,
  reporter: "list",
});
