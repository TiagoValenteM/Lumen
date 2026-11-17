import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3172",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "browser-fixture-not-a-secret",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "browser-fixture-not-a-secret",
  SUPABASE_SECRET_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  OPENROUTER_API_KEY: "",
  FIND_A_SPOT_AI_ENABLED: "false",
  LUMEN_E2E_BASE_URL: "http://127.0.0.1:3171",
  LUMEN_E2E_START_SERVER: "1",
  LUMEN_E2E_ALLOW_WRITES: "",
};

for (const command of [["build", "--webpack"], ["test:e2e", "--workers=1", ...args]]) {
  const run = spawnSync("pnpm", command, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (run.error) throw run.error;
  if (run.status !== 0) process.exit(run.status ?? 1);
}
