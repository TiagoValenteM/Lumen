#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const DEFAULT_INPUT = "data/location-leads/laptopfriendly-workspace-import.json";
const DEFAULT_JSON_OUTPUT = "data/location-leads/laptopfriendly-workspace-import-enriched.json";
const DEFAULT_SQL_OUTPUT = "data/location-leads/laptopfriendly-workspace-location-fix.sql";
const REQUEST_DELAY_MS = 1200;

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input || DEFAULT_INPUT);
const jsonOutputPath = resolve(args.jsonOutput || DEFAULT_JSON_OUTPUT);
const sqlOutputPath = resolve(args.sqlOutput || DEFAULT_SQL_OUTPUT);
const importFile = JSON.parse(await readFile(inputPath, "utf8"));
const generatedAt = new Date().toISOString();
const enrichedWorkspaces = [];

for (const workspace of importFile.workspaces || []) {
  process.stdout.write(`Geocoding ${workspace.name}...\n`);
  const result = await geocodeWorkspace(workspace);
  enrichedWorkspaces.push(toEnrichedWorkspace(workspace, result, generatedAt));
  await delay(REQUEST_DELAY_MS);
}

const payload = {
  generated_at: generatedAt,
  input_file: inputPath,
  source: {
    name: "OpenStreetMap Nominatim",
    attribution: "© OpenStreetMap contributors",
    license_url: "https://www.openstreetmap.org/copyright",
  },
  workspaces: enrichedWorkspaces,
};

await mkdir(dirname(jsonOutputPath), { recursive: true });
await writeFile(jsonOutputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await writeFile(sqlOutputPath, buildSql(payload), "utf8");

const matched = enrichedWorkspaces.filter((workspace) => workspace.geocoding_status === "matched").length;
process.stdout.write(`Saved ${matched}/${enrichedWorkspaces.length} enriched locations to ${jsonOutputPath}\n`);
process.stdout.write(`Saved SQL patch to ${sqlOutputPath}\n`);

function parseArgs(rawArgs) {
  const parsed = {
    input: DEFAULT_INPUT,
    jsonOutput: DEFAULT_JSON_OUTPUT,
    sqlOutput: DEFAULT_SQL_OUTPUT,
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

    if (arg === "--help") {
      process.stdout.write(
        [
          "Usage: node scripts/enrich-workspace-import-locations.mjs [options]",
          "",
          "Options:",
          "  --input data/location-leads/laptopfriendly-workspace-import.json",
          "  --json-output data/location-leads/laptopfriendly-workspace-import-enriched.json",
          "  --sql-output data/location-leads/laptopfriendly-workspace-location-fix.sql",
        ].join("\n"),
      );
      process.stdout.write("\n");
      process.exit(0);
    }
  }

  return parsed;
}

async function geocodeWorkspace(workspace) {
  const queries = buildQueries(workspace);

  for (const query of queries) {
    const result = await searchNominatim(query);
    if (result) return { ...result, query };
    await delay(REQUEST_DELAY_MS);
  }

  return null;
}

function buildQueries(workspace) {
  const city = workspace.location_raw?.city_name || "New York";
  const country = workspace.location_raw?.country || "United States";
  const address = workspace.address || "";
  const name = workspace.name.replace(/\s*@\s*/gu, " ");
  const normalizedName = name.replace(/\s+\([^)]*\)/gu, "");

  return Array.from(
    new Set([
      `${normalizedName}, ${address}, ${city}, ${country}`,
      `${workspace.name}, ${address}, ${city}, ${country}`,
      `${address}, ${city}, ${country}`,
    ]),
  ).filter((query) => query.replace(/[, ]/gu, "").length > 0);
}

async function searchNominatim(query) {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("bounded", "1");
  url.searchParams.set("viewbox", "-74.2591,40.9176,-73.7004,40.4774");

  const response = await fetch(url, {
    headers: {
      "user-agent": "Lumen location lead geocoding (admin review)",
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

function toEnrichedWorkspace(workspace, result, generatedAt) {
  if (!result) {
    return {
      slug: workspace.slug,
      name: workspace.name,
      geocoding_status: "not_found",
      original_address: workspace.address,
      address: workspace.address,
      latitude: workspace.latitude,
      longitude: workspace.longitude,
      location_confidence: workspace.location_confidence,
      geocoding: null,
    };
  }

  const latitude = Number(Number(result.lat).toFixed(7));
  const longitude = Number(Number(result.lon).toFixed(7));
  const address = formatAddress(result.address) || result.display_name || workspace.address;
  const confidence = getConfidence(result);

  return {
    slug: workspace.slug,
    name: workspace.name,
    geocoding_status: "matched",
    original_address: workspace.address,
    address,
    latitude,
    longitude,
    location_confidence: confidence,
    geocoding: {
      provider: "nominatim",
      provider_id: result.osm_type && result.osm_id ? `${result.osm_type}/${result.osm_id}` : null,
      provider_url: result.osm_type && result.osm_id ? `https://www.openstreetmap.org/${toOsmUrlType(result.osm_type)}/${result.osm_id}` : null,
      display_name: result.display_name || null,
      class: result.class || null,
      type: result.type || null,
      importance: numberOrNull(result.importance),
      place_rank: numberOrNull(result.place_rank),
      query: result.query,
      geocoded_at: generatedAt,
    },
  };
}

function formatAddress(address) {
  if (!address) return null;

  const houseNumber = address.house_number;
  const road = address.road || address.pedestrian || address.footway || address.cycleway;
  const borough = address.borough || address.suburb || address.neighbourhood;
  const city = address.city || address.town || address.village || "New York";
  const state = address.state || "New York";
  const postcode = address.postcode;

  const lineOne = [houseNumber, road].filter(Boolean).join(" ");
  const lineTwo = [borough, city, state, postcode].filter(Boolean).join(", ");
  return [lineOne, lineTwo].filter(Boolean).join(", ") || null;
}

function getConfidence(result) {
  const resultClass = result.class;
  const type = result.type;
  if (["amenity", "shop", "office", "tourism", "leisure"].includes(resultClass)) return 0.9;
  if (["house", "building", "yes"].includes(type)) return 0.8;
  if (result.address?.house_number) return 0.75;
  return 0.6;
}

function buildSql(payload) {
  const lines = [
    "-- Lumen location fix generated from Nominatim/OpenStreetMap geocoding.",
    "-- Run after laptopfriendly-workspace-import.sql.",
    "-- Review any rows that remain without coordinates.",
    "BEGIN;",
    "",
  ];

  for (const workspace of payload.workspaces) {
    if (workspace.geocoding_status !== "matched") {
      lines.push(`-- No geocoding match for ${workspace.name} (${workspace.slug}); left unchanged.`, "");
      continue;
    }

    const geocodingJson = JSON.stringify({
      geocoding: workspace.geocoding,
    });
    const note = [
      "Location enriched from OpenStreetMap/Nominatim.",
      `Matched address: ${workspace.address}.`,
      `Coordinates: ${workspace.latitude}, ${workspace.longitude}.`,
      workspace.geocoding?.provider_url ? `OSM: ${workspace.geocoding.provider_url}.` : null,
    ]
      .filter(Boolean)
      .join(" ");

    lines.push(
      [
        "UPDATE workspaces",
        "SET",
        `  address = ${sql(workspace.address)},`,
        `  latitude = ${sqlNumber(workspace.latitude)},`,
        `  longitude = ${sqlNumber(workspace.longitude)},`,
        "  location_source = 'external_lead',",
        "  location_provider = 'laptopfriendly+nominatim',",
        `  location_confidence = ${sqlNumber(workspace.location_confidence)},`,
        `  location_raw = COALESCE(location_raw, '{}'::jsonb) || ${sqlJson(geocodingJson)},`,
        `  admin_notes = CONCAT_WS(E'\\n', admin_notes, ${sql(note)})`,
        `WHERE slug = ${sql(workspace.slug)};`,
      ].join("\n"),
      "",
    );
  }

  lines.push("COMMIT;", "");
  return lines.join("\n");
}

function toOsmUrlType(osmType) {
  if (osmType === "node") return "node";
  if (osmType === "way") return "way";
  if (osmType === "relation") return "relation";
  return osmType;
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (value === null || value === undefined) return "NULL";
  return `${sql(value)}::jsonb`;
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? String(numberValue) : "NULL";
}

function numberOrNull(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function delay(ms) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}
