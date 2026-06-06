#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DEFAULT_INPUT = "data/location-leads/laptopfriendly-workspace-import-enriched.json";
const DEFAULT_OUTPUT = "data/location-leads/laptopfriendly-workspace-photo-candidates.sql";
const FALLBACK_IMAGE_BY_SLUG = {
  "new-york-public-library-stephen-a-schwarzman-building-new-york": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/New_York_Public_Library_-_Main_Branch_%2851553970198%29.jpg/1280px-New_York_Public_Library_-_Main_Branch_%2851553970198%29.jpg",
    page_url: "https://commons.wikimedia.org/wiki/File:New_York_Public_Library_-_Main_Branch_(51553970198).jpg",
    caption: "Photo from Wikimedia Commons. Verify license and attribution before approving.",
  },
};

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input || DEFAULT_INPUT);
const outputPath = resolve(args.output || DEFAULT_OUTPUT);
const importFile = JSON.parse(await readFile(inputPath, "utf8"));
const photoRows = [];

for (const workspace of importFile.workspaces || []) {
  process.stdout.write(`Checking curated image for ${workspace.name}...\n`);
  const fallback = FALLBACK_IMAGE_BY_SLUG[workspace.slug];
  const image = fallback || null;

  if (image) {
    photoRows.push({
      slug: workspace.slug,
      name: workspace.name,
      url: image.url,
      caption: image.caption || buildCaption(image),
      source_url: image.page_url || null,
    });
  }

}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, buildSql(photoRows), "utf8");

process.stdout.write(`Saved ${photoRows.length} photo candidate inserts to ${outputPath}\n`);

function parseArgs(rawArgs) {
  const parsed = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = rawArgs[index + 1];

    if (arg === "--input" && next) {
      parsed.input = next;
      index += 1;
      continue;
    }

    if (arg === "--output" && next) {
      parsed.output = next;
      index += 1;
      continue;
    }

    if (arg === "--help") {
      process.stdout.write(
        [
          "Usage: node scripts/build-workspace-photo-import.mjs [options]",
          "",
          "Options:",
          "  --input data/location-leads/laptopfriendly-workspace-import-enriched.json",
          "  --output data/location-leads/laptopfriendly-workspace-photo-candidates.sql",
        ].join("\n"),
      );
      process.stdout.write("\n");
      process.exit(0);
    }
  }

  return parsed;
}

function buildCaption(image) {
  const parts = ["Photo candidate from Wikimedia Commons."];
  if (image.license) parts.push(`License: ${image.license}.`);
  if (image.artist) parts.push(`Creator: ${image.artist}.`);
  parts.push("Verify attribution/license before approving.");
  return parts.join(" ");
}

function buildSql(photoRows) {
  const lines = [
    "-- Lumen photo candidate inserts for imported LaptopFriendly leads.",
    "-- Run after laptopfriendly-workspace-import.sql and laptopfriendly-workspace-location-fix.sql.",
    "-- Photos are inserted as pending, not approved.",
    "BEGIN;",
    "",
  ];

  for (const row of photoRows) {
    lines.push(
      [
        "INSERT INTO workspace_photos (workspace_id, url, caption, is_primary, is_approved)",
        "SELECT id,",
        `  ${sql(row.url)},`,
        `  ${sql(row.caption)},`,
        "  NOT EXISTS (SELECT 1 FROM workspace_photos existing WHERE existing.workspace_id = workspaces.id AND existing.is_primary = true),",
        "  false",
        "FROM workspaces",
        `WHERE slug = ${sql(row.slug)}`,
        "  AND NOT EXISTS (",
        "    SELECT 1",
        "    FROM workspace_photos existing",
        "    WHERE existing.workspace_id = workspaces.id",
        `      AND existing.url = ${sql(row.url)}`,
        "  );",
        "",
      ].join("\n"),
    );
  }

  lines.push("COMMIT;", "");

  if (photoRows.length === 0) {
    lines.splice(4, 0, "-- No reliable open image candidates found.");
  }

  return lines.join("\n");
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}
