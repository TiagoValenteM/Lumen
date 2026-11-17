#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { leadStatus, workspaceLeadRow } from "./import-policy.mjs";

const DEFAULT_INPUT = "data/location-leads/laptopfriendly-us-leads.json";
const DEFAULT_JSON_OUTPUT = "data/location-leads/laptopfriendly-workspace-import.json";
const DEFAULT_SQL_OUTPUT = "data/location-leads/laptopfriendly-workspace-import.sql";
const workspaceTypes = new Set(["cafe", "coworking", "hotel_lobby", "library", "restaurant", "other"]);

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
  note: "Review-only lead rows. Verify facts before publishing.",
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
          "Usage: node scripts/location-imports/build-workspace-import.mjs [options]",
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

  leadStatus(parsed.status);

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

function toWorkspaceImportRow(lead, status, generatedAt) {
  const city_slug = buildCitySlug(lead.city_name || "Unknown", lead.country || "Unknown");
  const row = workspaceLeadRow({
    name: lead.name,
    slug: slugify(`${lead.name}-${lead.city_name || ""}`),
    type: workspaceTypes.has(lead.type) ? lead.type : "other",
    address: lead.address || null,
    latitude: lead.latitude ?? null,
    longitude: lead.longitude ?? null,
    website: lead.website || null,
    phone: lead.phone || null,
    location_source: "external_lead",
    location_provider: lead.source || null,
    location_provider_id: lead.source_url || null,
    location_confidence: Number.isFinite(lead.latitude) && Number.isFinite(lead.longitude) ? 0.75 : 0.35,
    location_raw: lead,
    admin_notes: [
      `Lead from ${lead.source || "unidentified source"}.`,
      lead.source_url ? `Source: ${lead.source_url}.` : null,
      "Verify the location, laptop policy, opening hours, Wi-Fi and outlets before approval.",
      `Generated ${generatedAt}.`,
    ].filter(Boolean).join("\n"),
  }, undefined, status);
  return { ...row, city_slug };
}

function buildSql(payload) {
  const lines = ["-- Pending lead import. Existing city and place rows are not changed.", "BEGIN;"];
  for (const city of payload.cities) {
    lines.push(
      "INSERT INTO public.cities (name, slug, country, country_code)",
      `VALUES (${sql(city.name)}, ${sql(city.slug)}, ${sql(city.country)}, ${sql(city.country_code)})`,
      "ON CONFLICT (slug) DO NOTHING;",
    );
  }

  for (const workspace of payload.workspaces) {
    const row = workspaceLeadRow(workspace, undefined);
    delete row.city_id;
    const columns = Object.keys(row).join(", ");
    lines.push(
      `INSERT INTO public.workspaces (city_id, ${columns})`,
      `SELECT c.id, ${Object.keys(row).map((key) => `incoming.${key}`).join(", ")}`,
      `FROM jsonb_populate_record(NULL::public.workspaces, ${sql(JSON.stringify(row))}::jsonb) AS incoming`,
      `JOIN public.cities c ON c.slug = ${sql(workspace.city_slug)}`,
      "ON CONFLICT (slug) DO NOTHING;",
    );
  }

  return [...lines, "COMMIT;", ""].join("\n");
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
