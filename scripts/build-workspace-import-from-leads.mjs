#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DEFAULT_INPUT = "data/location-leads/laptopfriendly-us-leads.json";
const DEFAULT_JSON_OUTPUT = "data/location-leads/laptopfriendly-workspace-import.json";
const DEFAULT_SQL_OUTPUT = "data/location-leads/laptopfriendly-workspace-import.sql";

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input || DEFAULT_INPUT);
const jsonOutputPath = resolve(args.jsonOutput || DEFAULT_JSON_OUTPUT);
const sqlOutputPath = resolve(args.sqlOutput || DEFAULT_SQL_OUTPUT);
const status = args.status || "pending";

const leadFile = JSON.parse(await readFile(inputPath, "utf8"));
const generatedAt = new Date().toISOString();
const cities = buildCities(leadFile.leads || []);
const workspaces = (leadFile.leads || []).map((lead) => toWorkspaceImportRow(lead, status, generatedAt));
const payload = {
  generated_at: generatedAt,
  input_file: inputPath,
  note: "Lumen-shaped import rows. Review before inserting. Pending rows appear in admin, approved rows appear publicly.",
  cities,
  workspaces,
};

await mkdir(dirname(jsonOutputPath), { recursive: true });
await writeFile(jsonOutputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await writeFile(sqlOutputPath, buildSql(payload), "utf8");

process.stdout.write(`Saved ${workspaces.length} workspace rows to ${jsonOutputPath}\n`);
process.stdout.write(`Saved SQL import draft to ${sqlOutputPath}\n`);

function parseArgs(rawArgs) {
  const parsed = {
    input: DEFAULT_INPUT,
    jsonOutput: DEFAULT_JSON_OUTPUT,
    sqlOutput: DEFAULT_SQL_OUTPUT,
    status: "pending",
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = rawArgs[index + 1];

    if (arg === "--input" && next) {
      parsed.input = next;
      index += 1;
      continue;
    }

    if (arg === "--json-output" && next) {
      parsed.jsonOutput = next;
      index += 1;
      continue;
    }

    if (arg === "--sql-output" && next) {
      parsed.sqlOutput = next;
      index += 1;
      continue;
    }

    if (arg === "--status" && next) {
      parsed.status = next;
      index += 1;
      continue;
    }

    if (arg === "--help") {
      process.stdout.write(
        [
          "Usage: node scripts/build-workspace-import-from-leads.mjs [options]",
          "",
          "Options:",
          "  --input data/location-leads/laptopfriendly-us-leads.json",
          "  --json-output data/location-leads/laptopfriendly-workspace-import.json",
          "  --sql-output data/location-leads/laptopfriendly-workspace-import.sql",
          "  --status pending",
        ].join("\n"),
      );
      process.stdout.write("\n");
      process.exit(0);
    }
  }

  if (!["pending", "under_review", "approved"].includes(parsed.status)) {
    fail("--status must be pending, under_review, or approved");
  }

  return parsed;
}

function buildCities(leads) {
  const bySlug = new Map();

  for (const lead of leads) {
    const name = lead.city_name || "Unknown";
    const country = lead.country || "Unknown";
    const slug = buildCitySlug(name, country);

    if (!bySlug.has(slug)) {
      bySlug.set(slug, {
        name,
        slug,
        country,
        country_code: lead.country_code || null,
        workspace_count: 0,
        featured: false,
      });
    }
  }

  return Array.from(bySlug.values());
}

function toWorkspaceImportRow(lead, workspaceStatus, generatedAt) {
  const citySlug = buildCitySlug(lead.city_name || "Unknown", lead.country || "Unknown");
  const sourceName = lead.source === "laptopfriendly" ? "LaptopFriendly" : lead.source;
  const sourceSummary = [`Lead from ${sourceName}.`, lead.source_url ? `Source: ${lead.source_url}` : null]
    .filter(Boolean)
    .join(" ");

  return {
    name: lead.name,
    slug: slugify(`${lead.name}-${lead.city_name || ""}`),
    type: normalizeWorkspaceType(lead.type),
    status: workspaceStatus,
    city_slug: citySlug,
    address: lead.address || null,
    latitude: lead.latitude ?? null,
    longitude: lead.longitude ?? null,
    website: lead.website || null,
    phone: lead.phone || null,
    description: null,
    short_description: getShortDescription(lead),
    opening_hours: null,
    has_wifi: Boolean(lead.has_wifi),
    wifi_speed: null,
    wifi_password_required: false,
    has_power_outlets: Boolean(lead.has_power_outlets),
    power_outlet_availability: lead.has_power_outlets === true ? 3 : null,
    seating_capacity: null,
    seating_comfort: null,
    has_outdoor_seating: Boolean(lead.has_outdoor_seating),
    has_standing_desks: false,
    noise_level: null,
    has_natural_light: Boolean(lead.has_natural_light),
    has_air_conditioning: Boolean(lead.has_air_conditioning),
    has_heating: false,
    music_volume: null,
    has_restrooms: Boolean(lead.has_restrooms),
    has_parking: Boolean(lead.has_parking),
    has_bike_parking: false,
    is_accessible: Boolean(lead.is_accessible),
    allows_pets: Boolean(lead.allows_pets),
    has_food: Boolean(lead.has_food),
    has_veg: Boolean(lead.has_veg),
    has_coffee: Boolean(lead.has_coffee),
    has_alcohol: Boolean(lead.has_alcohol),
    price_range: null,
    laptop_friendly: Boolean(lead.laptop_friendly),
    time_limit_hours: null,
    minimum_purchase_required: false,
    good_for_meetings: Boolean(lead.good_for_groups),
    good_for_calls: Boolean(lead.good_for_calls),
    good_for_groups: Boolean(lead.good_for_groups),
    location_source: "external_lead",
    location_provider: lead.source || null,
    location_provider_id: lead.source_url || null,
    location_confidence: lead.latitude && lead.longitude ? 0.75 : 0.35,
    location_raw: lead,
    admin_notes: [
      sourceSummary,
      lead.laptopfriendly_score !== null && lead.laptopfriendly_score !== undefined
        ? `LaptopFriendly score: ${lead.laptopfriendly_score}.`
        : null,
      lead.opening_hours_note ? `Opening hours note: ${lead.opening_hours_note}.` : null,
      "Verify address, coordinates, photos, policies, and workability before approval.",
      `Generated ${generatedAt}.`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function getShortDescription(lead) {
  const details = [];
  if (lead.laptopfriendly_score !== null && lead.laptopfriendly_score !== undefined) {
    details.push(`${lead.laptopfriendly_score}% laptop-friendly source score`);
  }
  if (lead.has_wifi) details.push("WiFi");
  if (lead.has_power_outlets) details.push("power");
  if (lead.good_for_calls) details.push("calls");
  if (lead.has_coffee) details.push("coffee");
  return details.length > 0 ? `Imported lead: ${details.join(", ")}. Needs verification.` : "Imported lead. Needs verification.";
}

function normalizeWorkspaceType(value) {
  const allowed = new Set(["cafe", "coworking", "hotel_lobby", "library", "restaurant", "other"]);
  return allowed.has(value) ? value : "other";
}

function buildSql(payload) {
  const lines = [
    "-- Lumen workspace import draft generated from lead data.",
    "-- Review before running. Pending rows show in admin, approved rows show publicly.",
    "BEGIN;",
    "",
  ];

  for (const city of payload.cities) {
    lines.push(
      [
        "INSERT INTO cities (name, slug, country, country_code, workspace_count, featured)",
        `VALUES (${sql(city.name)}, ${sql(city.slug)}, ${sql(city.country)}, ${sql(city.country_code)}, 0, false)`,
        "ON CONFLICT (slug) DO UPDATE SET",
        "  name = EXCLUDED.name,",
        "  country = EXCLUDED.country,",
        "  country_code = EXCLUDED.country_code;",
      ].join("\n"),
      "",
    );
  }

  for (const workspace of payload.workspaces) {
    lines.push(
      [
        "INSERT INTO workspaces (",
        "  name, slug, type, status, city_id, address, latitude, longitude, website, phone,",
        "  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,",
        "  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,",
        "  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,",
        "  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,",
        "  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,",
        "  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,",
        "  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,",
        "  location_provider_id, location_confidence, location_raw, admin_notes",
        ")",
        "VALUES (",
        `  ${sql(workspace.name)}, ${sql(workspace.slug)}, ${sql(workspace.type)}::workspace_type, ${sql(workspace.status)}::workspace_status,`,
        `  (SELECT id FROM cities WHERE slug = ${sql(workspace.city_slug)} LIMIT 1),`,
        `  ${sql(workspace.address)}, ${sqlNumber(workspace.latitude)}, ${sqlNumber(workspace.longitude)}, ${sql(workspace.website)}, ${sql(workspace.phone)},`,
        `  ${sql(workspace.description)}, ${sql(workspace.short_description)}, ${sqlJson(workspace.opening_hours)},`,
        `  ${sqlBoolean(workspace.has_wifi)}, ${sql(workspace.wifi_speed)}::wifi_speed, ${sqlBoolean(workspace.wifi_password_required)},`,
        `  ${sqlBoolean(workspace.has_power_outlets)}, ${sqlNumber(workspace.power_outlet_availability)},`,
        `  ${sqlNumber(workspace.seating_capacity)}, ${sql(workspace.seating_comfort)}::seating_comfort,`,
        `  ${sqlBoolean(workspace.has_outdoor_seating)}, ${sqlBoolean(workspace.has_standing_desks)}, ${sql(workspace.noise_level)}::noise_level,`,
        `  ${sqlBoolean(workspace.has_natural_light)}, ${sqlBoolean(workspace.has_air_conditioning)}, ${sqlBoolean(workspace.has_heating)},`,
        `  ${sqlNumber(workspace.music_volume)}, ${sqlBoolean(workspace.has_restrooms)}, ${sqlBoolean(workspace.has_parking)},`,
        `  ${sqlBoolean(workspace.has_bike_parking)}, ${sqlBoolean(workspace.is_accessible)}, ${sqlBoolean(workspace.allows_pets)},`,
        `  ${sqlBoolean(workspace.has_food)}, ${sqlBoolean(workspace.has_veg)}, ${sqlBoolean(workspace.has_coffee)},`,
        `  ${sqlBoolean(workspace.has_alcohol)}, ${sqlNumber(workspace.price_range)}, ${sqlBoolean(workspace.laptop_friendly)},`,
        `  ${sqlNumber(workspace.time_limit_hours)}, ${sqlBoolean(workspace.minimum_purchase_required)},`,
        `  ${sqlBoolean(workspace.good_for_meetings)}, ${sqlBoolean(workspace.good_for_calls)}, ${sqlBoolean(workspace.good_for_groups)},`,
        `  ${sql(workspace.location_source)}, ${sql(workspace.location_provider)}, ${sql(workspace.location_provider_id)},`,
        `  ${sqlNumber(workspace.location_confidence)}, ${sqlJson(workspace.location_raw)}, ${sql(workspace.admin_notes)}`,
        ")",
        "ON CONFLICT (slug) DO UPDATE SET",
        "  admin_notes = EXCLUDED.admin_notes,",
        "  location_raw = EXCLUDED.location_raw,",
        "  location_provider_id = EXCLUDED.location_provider_id;",
      ].join("\n"),
      "",
    );
  }

  lines.push("COMMIT;", "");
  return lines.join("\n");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
}

function buildCitySlug(city, country) {
  return [slugify(city), slugify(country)].filter(Boolean).join("-") || "global";
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (value === null || value === undefined) return "NULL";
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function sqlBoolean(value) {
  return value ? "true" : "false";
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? String(numberValue) : "NULL";
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
