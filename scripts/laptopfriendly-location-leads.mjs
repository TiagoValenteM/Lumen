#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const BASE_URL = "https://laptopfriendly.co";
const DEFAULT_OUTPUT = "data/location-leads/laptopfriendly-us-leads.json";
const DEFAULT_LIMIT_PER_CITY = 8;
const REQUEST_DELAY_MS = 1200;

const US_CITIES = {
  "new-york": {
    name: "New York",
    country: "United States",
    country_code: "US",
    url: `${BASE_URL}/new-york`,
  },
};

const args = parseArgs(process.argv.slice(2));
const selectedCityKeys = args.cities.length > 0 ? args.cities : ["new-york"];
const limitPerCity = Number(args.limitPerCity || DEFAULT_LIMIT_PER_CITY);
const outputPath = resolve(args.output || DEFAULT_OUTPUT);

const unknownCities = selectedCityKeys.filter((city) => !US_CITIES[city]);
if (unknownCities.length > 0) {
  fail(`Unknown city key: ${unknownCities.join(", ")}. Known keys: ${Object.keys(US_CITIES).join(", ")}`);
}

const exportedAt = new Date().toISOString();
const leads = [];

for (const cityKey of selectedCityKeys) {
  const city = US_CITIES[cityKey];
  process.stdout.write(`Fetching LaptopFriendly ${city.name} index...\n`);
  const cityHtml = await fetchHtml(city.url);
  const paths = getDetailPaths(cityHtml, cityKey).slice(0, limitPerCity);

  for (const path of paths) {
    const url = `${BASE_URL}${path}`;
    process.stdout.write(`Fetching ${url}\n`);
    const detailHtml = await fetchHtml(url);
    const lead = toLead(detailHtml, city, url, exportedAt);
    if (lead) leads.push(lead);
    await delay(REQUEST_DELAY_MS);
  }
}

const payload = {
  generated_at: exportedAt,
  source: {
    name: "LaptopFriendly",
    url: BASE_URL,
    note: "Small public-page research sample. Keep as admin-review leads and verify before publishing in Lumen.",
  },
  cities: selectedCityKeys.map((key) => US_CITIES[key]),
  leads,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

process.stdout.write(`Saved ${leads.length} leads to ${outputPath}\n`);

function parseArgs(rawArgs) {
  const parsed = {
    cities: [],
    limitPerCity: DEFAULT_LIMIT_PER_CITY,
    output: DEFAULT_OUTPUT,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = rawArgs[index + 1];

    if (arg === "--cities" && next) {
      parsed.cities = next.split(",").map((value) => value.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === "--limit-per-city" && next) {
      parsed.limitPerCity = next;
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
          "Usage: node scripts/laptopfriendly-location-leads.mjs [options]",
          "",
          "Options:",
          "  --cities new-york",
          "  --limit-per-city 8",
          "  --output data/location-leads/laptopfriendly-us-leads.json",
        ].join("\n"),
      );
      process.stdout.write("\n");
      process.exit(0);
    }
  }

  return parsed;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Lumen location lead research (small manual review sample)",
      accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`LaptopFriendly request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function getDetailPaths(html, cityKey) {
  const paths = new Set();
  const pattern = new RegExp(`href=["'](/${escapeRegExp(cityKey)}/[^"'#?]+)["']`, "g");
  let match = pattern.exec(html);

  while (match) {
    const path = match[1];
    if (!path.endsWith(`/${cityKey}`) && path.split("/").length === 3) {
      paths.add(path);
    }
    match = pattern.exec(html);
  }

  return Array.from(paths);
}

function toLead(html, city, sourceUrl, exportedAt) {
  const text = htmlToText(html);
  const name = getHeading(html) || getTitle(html);
  if (!name) return null;

  const score = getLaptopFriendlyScore(text);
  const address = getAddress(html, city.name);
  const openingHours = getOpeningHours(text);

  return {
    source: "laptopfriendly",
    source_url: sourceUrl,
    imported_at: exportedAt,
    import_score: score ?? 0,
    needs_review: true,
    suggested_status: "pending",
    name,
    type: inferType(text),
    city_name: city.name,
    country: city.country,
    country_code: city.country_code,
    address,
    laptopfriendly_score: score,
    opening_hours_note: openingHours,
    has_wifi: featureIsHighOrMedium(text, "Stable Wi-Fi"),
    has_power_outlets: featureIsHighOrMedium(text, "Power sockets"),
    laptop_friendly: typeof score === "number" ? score >= 60 : null,
    good_for_calls: featureIsHighOrMedium(text, "Video/audio calls"),
    good_for_groups: featureIsHighOrMedium(text, "Group tables"),
    has_coffee: featureIsHighOrMedium(text, "Coffee"),
    has_food: featureIsHighOrMedium(text, "Food"),
    has_veg: featureIsHighOrMedium(text, "Veggie"),
    has_alcohol: featureIsHighOrMedium(text, "Alcohol"),
    has_natural_light: featureIsHighOrMedium(text, "Natural light"),
    has_outdoor_seating: featureIsHighOrMedium(text, "Outdoor area"),
    has_restrooms: featureIsHighOrMedium(text, "Restroom"),
    is_accessible: featureIsHighOrMedium(text, "Accessible"),
    has_air_conditioning: featureIsHighOrMedium(text, "Air conditioned"),
    allows_pets: featureIsHighOrMedium(text, "Pet friendly"),
    has_parking: featureIsHighOrMedium(text, "Parking"),
    review_note: "Verify facts before publishing. Review text and photos were intentionally not copied.",
  };
}

function getHeading(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? cleanText(stripTags(match[1])) : null;
}

function getTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const title = cleanText(stripTags(match[1]));
  return title?.replace(/\s*[:|-]\s*.*$/u, "") || null;
}

function getLaptopFriendlyScore(text) {
  const match = text.match(/(\d{1,3})%\s+Laptop Friendly/i);
  if (!match) return null;
  const score = Number(match[1]);
  return Number.isFinite(score) ? Math.min(score, 100) : null;
}

function getAddress(html, cityName) {
  const googleLinkPattern = /<a[^>]+href=["'][^"']*google\.com[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = googleLinkPattern.exec(html);

  while (match) {
    const text = cleanText(stripTags(match[1]));
    if (text && text.includes(cityName)) return text;
    match = googleLinkPattern.exec(html);
  }

  return null;
}

function getOpeningHours(text) {
  const dayPattern = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Closed|Open 24 hours|\d{2}:\d{2}\s+[–-]\s+\d{2}:\d{2})/gi;
  const days = [];
  let match = dayPattern.exec(text);

  while (match) {
    days.push(`${match[1]} ${match[2]}`);
    match = dayPattern.exec(text);
  }

  return days.length > 0 ? days.join("; ") : null;
}

function featureIsHighOrMedium(text, label) {
  const escaped = escapeRegExp(label);
  const pattern = new RegExp(`${escaped}\\s+(High|Medium|Low)`, "i");
  const match = text.match(pattern);
  if (!match) return null;
  return ["high", "medium"].includes(match[1].toLowerCase());
}

function inferType(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("library")) return "library";
  if (normalized.includes("hotel")) return "hotel_lobby";
  if (normalized.includes("restaurant")) return "restaurant";
  return "cafe";
}

function htmlToText(html) {
  return decodeEntities(stripTags(html))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function cleanText(value) {
  if (typeof value !== "string") return null;
  const trimmed = decodeEntities(value).replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function delay(ms) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
