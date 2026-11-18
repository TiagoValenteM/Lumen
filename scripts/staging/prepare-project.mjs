import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildStagingBootstrap } from "../build-staging-bootstrap.mjs";

if (!process.env.CI || !process.env.RUNNER_TEMP) throw new Error("Disposable staging requires a CI runner's temporary directory.");
const root = join(process.env.RUNNER_TEMP, "lumen-staging");
await mkdir(root, { recursive: true });
execFileSync("supabase", ["init", "--workdir", root, "--yes"], { stdio: "inherit" });
await mkdir(join(root, "supabase/migrations"), { recursive: true });
await writeFile(join(root, "supabase/migrations/20261118000000_lumen_bootstrap.sql"), await buildStagingBootstrap(), { flag: "wx" });
console.log("Prepared a fresh local-only Supabase project; no hosted project is linked.");
