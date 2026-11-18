import { spawnSync } from "node:child_process";
import { assertStagingTarget } from "../../tests/support/staging-target.mjs";

const env = { ...process.env };
for (const key of ["LUMEN_E2E_SUPABASE_PUBLISHABLE_KEY", "LUMEN_E2E_SUPABASE_SECRET_KEY", "LUMEN_E2E_MEMBER_EMAIL",
  "LUMEN_E2E_MEMBER_PASSWORD", "LUMEN_E2E_ADMIN_EMAIL", "LUMEN_E2E_ADMIN_PASSWORD"]) {
  if (!env[key]) throw new Error(`Missing ${key}; refusing to run a skipped staging test.`);
}
assertStagingTarget(env.LUMEN_E2E_BASE_URL, env.LUMEN_E2E_SUPABASE_URL, env.LUMEN_E2E_CONFIRM_DATABASE_ORIGIN);
if (env.LUMEN_E2E_ALLOW_WRITES !== "staging" || env.LUMEN_E2E_BASE_URL !== "http://127.0.0.1:3173" ||
  env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" || env.LUMEN_E2E_SUPABASE_URL !== env.NEXT_PUBLIC_SUPABASE_URL ||
  env.OPENROUTER_API_KEY || env.LUMEN_E2E_START_SERVER === "1") {
  throw new Error("This runner accepts only the disposable loopback app and database, with external AI disabled.");
}
for (const args of [["build", "--webpack"],
  ["test:e2e", "tests/e2e/workspace-review.spec.ts", "--workers=1", "--browser=chromium", "--output=test-results/staging-chromium"],
  ["test:e2e", "tests/e2e/workspace-review.spec.ts", "--workers=1", "--browser=webkit", "--output=test-results/staging-webkit"]]) {
  const result = spawnSync("pnpm", args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
