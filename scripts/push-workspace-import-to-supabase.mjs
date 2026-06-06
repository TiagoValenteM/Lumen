#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_INPUT = "data/location-leads/laptopfriendly-workspace-import.json";

const args = parseArgs(process.argv.slice(2));
loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const inputPath = resolve(args.input || DEFAULT_INPUT);
const importFile = JSON.parse(await readFile(inputPath, "utf8"));
const dryRun = args.dryRun;
const requestedStatus = args.status;
const cities = importFile.cities || [];
const workspaces = importFile.workspaces || [];

process.stdout.write(`${dryRun ? "Dry run:" : "Importing"} ${cities.length} cities and ${workspaces.length} workspaces...\n`);

if (dryRun) {
  process.stdout.write(`Input: ${inputPath}\n`);
  process.stdout.write(`Status: ${requestedStatus || "from import file"}\n`);
} else {
  if (!supabaseUrl || !serviceRoleKey) {
    fail(
      [
        "Missing Supabase write credentials.",
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local for this one-off admin import script.",
        "The existing public/anon key is not enough because Lumen protects workspace inserts with RLS.",
      ].join("\n"),
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
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
    dryRun: false,
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

    if (arg === "--help") {
      process.stdout.write(
        [
          "Usage: node scripts/push-workspace-import-to-supabase.mjs [options]",
          "",
          "Options:",
          "  --input data/location-leads/laptopfriendly-workspace-import.json",
          "  --status pending",
          "  --dry-run",
          "",
          "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        ].join("\n"),
      );
      process.stdout.write("\n");
      process.exit(0);
    }
  }

  if (parsed.status && !["pending", "under_review", "approved"].includes(parsed.status)) {
    fail("--status must be pending, under_review, or approved");
  }

  return parsed;
}

async function upsertCities(supabase, rows) {
  if (rows.length === 0) return;

  const cityRows = rows.map((city) => ({
    name: city.name,
    slug: city.slug,
    country: city.country,
    country_code: city.country_code,
    workspace_count: city.workspace_count ?? 0,
    featured: city.featured ?? false,
  }));

  const { error } = await supabase.from("cities").upsert(cityRows, { onConflict: "slug" });
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

    return toSupabaseWorkspaceRow(workspace, cityId, statusOverride);
  });

  const { error } = await supabase.from("workspaces").upsert(workspaceRows, { onConflict: "slug" });
  if (error) throw new Error(`Could not upsert workspaces: ${formatSupabaseError(error)}`);
}

function toSupabaseWorkspaceRow(workspace, cityId, statusOverride) {
  return {
    name: workspace.name,
    slug: workspace.slug,
    type: workspace.type,
    status: statusOverride || workspace.status || "pending",
    city_id: cityId,
    address: workspace.address,
    latitude: workspace.latitude,
    longitude: workspace.longitude,
    website: workspace.website,
    phone: workspace.phone,
    description: workspace.description,
    short_description: workspace.short_description,
    opening_hours: workspace.opening_hours,
    has_wifi: workspace.has_wifi,
    wifi_speed: workspace.wifi_speed,
    wifi_password_required: workspace.wifi_password_required,
    has_power_outlets: workspace.has_power_outlets,
    power_outlet_availability: workspace.power_outlet_availability,
    seating_capacity: workspace.seating_capacity,
    seating_comfort: workspace.seating_comfort,
    has_outdoor_seating: workspace.has_outdoor_seating,
    has_standing_desks: workspace.has_standing_desks,
    noise_level: workspace.noise_level,
    has_natural_light: workspace.has_natural_light,
    has_air_conditioning: workspace.has_air_conditioning,
    has_heating: workspace.has_heating,
    music_volume: workspace.music_volume,
    has_restrooms: workspace.has_restrooms,
    has_parking: workspace.has_parking,
    has_bike_parking: workspace.has_bike_parking,
    is_accessible: workspace.is_accessible,
    allows_pets: workspace.allows_pets,
    has_food: workspace.has_food,
    has_veg: workspace.has_veg,
    has_coffee: workspace.has_coffee,
    has_alcohol: workspace.has_alcohol,
    price_range: workspace.price_range,
    laptop_friendly: workspace.laptop_friendly,
    time_limit_hours: workspace.time_limit_hours,
    minimum_purchase_required: workspace.minimum_purchase_required,
    good_for_meetings: workspace.good_for_meetings,
    good_for_calls: workspace.good_for_calls,
    good_for_groups: workspace.good_for_groups,
    location_source: workspace.location_source,
    location_provider: workspace.location_provider,
    location_provider_id: workspace.location_provider_id,
    location_confidence: workspace.location_confidence,
    location_raw: workspace.location_raw,
    admin_notes: workspace.admin_notes,
  };
}

function loadEnvFile(path) {
  try {
    const contents = readFileSync(path, "utf8");
    for (const line of contents.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/u);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = unquote(match[2].trim());
    }
  } catch {
    // Optional env files are fine.
  }
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function formatSupabaseError(error) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" | ");
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
