#!/usr/bin/env node

import { loadEnvFile } from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { confirmImportTarget, leadStatus, workspaceLeadRow } from "./import-policy.mjs";

const DEFAULT_INPUT = "data/location-leads/laptopfriendly-workspace-import.json";

const args = parseArgs(process.argv.slice(2));
for (const path of [".env.local", ".env"]) {
  try { loadEnvFile(path); } catch (error) { if (error.code !== "ENOENT") throw error; }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const inputPath = resolve(args.input || DEFAULT_INPUT);
const importFile = JSON.parse(await readFile(inputPath, "utf8"));
const dryRun = args.dryRun;
const requestedStatus = args.status;
const cities = importFile.cities || [];
const workspaces = importFile.workspaces || [];
workspaces.forEach((workspace) => leadStatus(requestedStatus ?? workspace.status));

process.stdout.write(`${dryRun ? "Dry run:" : "Importing"} ${cities.length} cities and ${workspaces.length} workspaces...\n`);

if (dryRun) {
  process.stdout.write(`Input: ${inputPath}\n`);
  process.stdout.write(`Status: ${requestedStatus || "from import file"}\n`);
} else {
  const target = confirmImportTarget(supabaseUrl, args.target);
  if (!supabaseUrl || !serviceRoleKey) {
    fail(
      [
        "Missing Supabase write credentials.",
        "Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY for the intended environment.",
        "The existing public/anon key is not enough because Lumen protects workspace inserts with RLS.",
      ].join("\n"),
    );
  }

  const supabase = createClient(target, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  await upsertCities(supabase, cities);
  await upsertWorkspaces(supabase, workspaces, requestedStatus);
}

process.stdout.write(`${dryRun ? "Dry run complete" : "Import complete"}.\n`);

function parseArgs(rawArgs) {
  const parsed = {
    input: DEFAULT_INPUT,
    dryRun: true,
    target: null,
    status: null,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = rawArgs[index + 1];

    if (arg === "--input" && next) {
      parsed.input = next;
      index += 1;
      continue;
    }

    if (arg === "--status" && next) {
      parsed.status = next;
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--apply") {
      parsed.dryRun = false;
      continue;
    }
    if (arg === "--target" && next && !next.startsWith("--")) {
      parsed.target = next;
      index += 1;
      continue;
    }

    if (arg === "--help") {
      process.stdout.write(
        [
          "Usage: node scripts/location-imports/push-workspaces.mjs [options]",
          "",
          "Options:",
          "  --input data/location-leads/laptopfriendly-workspace-import.json",
          "  --status pending",
          "  --dry-run (default)",
          "  --apply --target https://<project-ref>.supabase.co",
          "",
          "Writes require NEXT_PUBLIC_SUPABASE_URL and a server-only Supabase secret.",
        ].join("\n"),
      );
      process.stdout.write("\n");
      process.exit(0);
    }
    fail(`Unknown or incomplete argument: ${arg}`);
  }

  if (parsed.status) leadStatus(parsed.status);

  return parsed;
}

async function upsertCities(supabase, rows) {
  if (rows.length === 0) return;

  const cityRows = rows.map((city) => ({
    name: city.name,
    slug: city.slug,
    country: city.country,
    country_code: city.country_code,
  }));

  const { error } = await supabase.from("cities").upsert(cityRows, { onConflict: "slug", ignoreDuplicates: true });
  if (error) throw new Error(`Could not upsert cities: ${formatSupabaseError(error)}`);
}

async function upsertWorkspaces(supabase, rows, statusOverride) {
  if (rows.length === 0) return;

  const citySlugs = Array.from(new Set(rows.map((workspace) => workspace.city_slug).filter(Boolean)));
  const { data: cityRows, error: cityError } = await supabase.from("cities").select("id, slug").in("slug", citySlugs);
  if (cityError) throw new Error(`Could not load city IDs: ${formatSupabaseError(cityError)}`);

  const cityIdBySlug = new Map((cityRows || []).map((city) => [city.slug, city.id]));
  const workspaceRows = rows.map((workspace) => {
    const cityId = cityIdBySlug.get(workspace.city_slug);
    if (!cityId) throw new Error(`Missing city for workspace ${workspace.name}: ${workspace.city_slug}`);

    return workspaceLeadRow(workspace, cityId, statusOverride);
  });

  const { error } = await supabase.from("workspaces").upsert(workspaceRows, { onConflict: "slug", ignoreDuplicates: true });
  if (error) throw new Error(`Could not upsert workspaces: ${formatSupabaseError(error)}`);
}

function formatSupabaseError(error) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" | ");
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
