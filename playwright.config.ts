import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: process.env.LUMEN_E2E_BASE_URL },
  timeout: 60_000,
  reporter: "list",
});
