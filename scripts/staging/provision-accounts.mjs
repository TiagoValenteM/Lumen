import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertStagingTarget } from "../../tests/support/staging-target.mjs";

if (!process.env.CI || !process.env.RUNNER_TEMP) throw new Error("Disposable staging requires a CI runner's temporary directory.");
const root = join(process.env.RUNNER_TEMP, "lumen-staging");
let status;
try {
  status = JSON.parse(execFileSync("supabase", ["status", "--workdir", root, "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
} catch {
  throw new Error("Could not read the disposable Supabase status. Credentials are not logged.");
}
const url = status.API_URL;
const publicKey = status.ANON_KEY || status.PUBLISHABLE_KEY;
const secretKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY;
const app = "http://127.0.0.1:3173";
assertStagingTarget(app, url, "http://127.0.0.1:54321");
if (url !== "http://127.0.0.1:54321" || !publicKey || !secretKey) {
  throw new Error("Expected the local Supabase API and test keys; refusing any hosted target.");
}
const mask = (value) => { if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${value}`); };
mask(publicKey);
mask(secretKey);
const service = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const users = {};
for (const role of ["member", "admin"]) {
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  mask(password);
  const email = `lumen-e2e-${role}@example.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Could not provision the staging ${role} account.`);
  const { error: profileError } = await service.from("profiles").upsert({
    id: data.user.id, first_name: "E2E", last_name: role, tag: `e2e${role}`,
  });
  if (profileError) throw new Error(`Could not provision the staging ${role} profile: ${profileError.code}`);
  users[role] = { id: data.user.id, email, password };
}
if (!/^[0-9a-f-]{36}$/.test(users.admin.id)) throw new Error("Invalid test account identifier.");
execFileSync("docker", ["exec", "-i", "supabase_db_lumen-staging", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
  input: `INSERT INTO lumen_private.admin_roles (user_id) VALUES ('${users.admin.id}'::uuid);`,
  stdio: ["pipe", "pipe", "pipe"],
});
const env = {
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: publicKey,
  SUPABASE_SECRET_KEY: secretKey,
  SUPABASE_SERVICE_ROLE_KEY: "",
  OPENROUTER_API_KEY: "",
  GEOAPIFY_API_KEY: "",
  LOCATIONIQ_API_KEY: "",
  FIND_A_SPOT_AI_ENABLED: "false",
  LUMEN_E2E_ALLOW_WRITES: "staging",
  LUMEN_E2E_BASE_URL: app,
  LUMEN_E2E_SUPABASE_URL: url,
  LUMEN_E2E_CONFIRM_DATABASE_ORIGIN: url,
  LUMEN_E2E_SUPABASE_PUBLISHABLE_KEY: publicKey,
  LUMEN_E2E_SUPABASE_SECRET_KEY: secretKey,
  LUMEN_E2E_MEMBER_EMAIL: users.member.email,
  LUMEN_E2E_MEMBER_PASSWORD: users.member.password,
  LUMEN_E2E_ADMIN_EMAIL: users.admin.email,
  LUMEN_E2E_ADMIN_PASSWORD: users.admin.password,
  LUMEN_E2E_START_STAGING: "1",
  LUMEN_E2E_START_SERVER: "0",
  LUMEN_E2E_BROWSER_WS_ENDPOINT: "ws://127.0.0.1:3002/",
};
await writeFile(join(process.env.RUNNER_TEMP, "lumen-staging.env"),
  Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n"), { mode: 0o600, flag: "wx" });
console.log("Created two disposable accounts and a private runner-only environment file.");
