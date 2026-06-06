#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

const DEFAULT_OUTPUT = "data/location-leads/us-workspace-leads.json";
const DEFAULT_LIMIT_PER_CITY = 12;
const DEFAULT_REQUEST_DELAY_MS = 1500;

const US_CITY_BOUNDS = {
  "new-york": {
    name: "New York",
    country: "United States",
    country_code: "US",
    bbox: [40.4774, -74.2591, 40.9176, -73.7004],
  },
  "san-francisco": {
    name: "San Francisco",
    country: "United States",
    country_code: "US",
    bbox: [37.6398, -123.1738, 37.9298, -122.2818],
  },
  austin: {
    name: "Austin",
    country: "United States",
    country_code: "US",
    bbox: [30.0987, -97.9384, 30.5169, -97.5615],
  },
  seattle: {
    name: "Seattle",
    country: "United States",
    country_code: "US",
    bbox: [47.481, -122.4597, 47.7341, -122.2244],
  },
  chicago: {
    name: "Chicago",
    country: "United States",
    country_code: "US",
    bbox: [41.6443, -87.9401, 42.023, -87.5237],
  },
};

const args = parseArgs(process.argv.slice(2));
const selectedCityKeys = args.cities.length > 0 ? args.cities : ["new-york", "san-francisco", "austin"];
const limitPerCity = Number(args.limitPerCity || DEFAULT_LIMIT_PER_CITY);
const outputPath = resolve(args.output || DEFAULT_OUTPUT);

const unknownCities = selectedCityKeys.filter((city) => !US_CITY_BOUNDS[city]);
if (unknownCities.length > 0) {
  fail(`Unknown city key: ${unknownCities.join(", ")}. Known keys: ${Object.keys(US_CITY_BOUNDS).join(", ")}`);
}

const exportedAt = new Date().toISOString();
const leads = [];

for (const cityKey of selectedCityKeys) {
  const city = US_CITY_BOUNDS[cityKey];
  process.stdout.write(`Fetching ${city.name} candidates...\n`);
  const elements = await fetchOverpassElements(city);
  const cityLeads = elements
    .map((element) => toLead(element, city, exportedAt))
    .filter(Boolean)
    .sort((a, b) => b.import_score - a.import_score || a.name.localeCompare(b.name))
    .slice(0, limitPerCity);

  leads.push(...cityLeads);
  await delay(DEFAULT_REQUEST_DELAY_MS);
}

const payload = {
  generated_at: exportedAt,
  source: {
    name: "OpenStreetMap via Overpass API",
    attribution: "© OpenStreetMap contributors",
    license_url: "https://www.openstreetmap.org/copyright",
    note: "Use these as admin-review leads. Verify details before publishing in Lumen.",
  },
  cities: selectedCityKeys.map((key) => US_CITY_BOUNDS[key]),
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
          "Usage: node scripts/osm-location-leads.mjs [options]",
          "",
          "Options:",
          "  --cities new-york,san-francisco,austin,seattle,chicago",
          "  --limit-per-city 12",
          "  --output data/location-leads/us-workspace-leads.json",
        ].join("\n"),
      );
      process.stdout.write("\n");
      process.exit(0);
    }
  }

  return parsed;
}

async function fetchOverpassElements(city) {
  const [south, west, north, east] = city.bbox;
  const query = `
    [out:json][timeout:30];
    (
      nwr["amenity"="cafe"]["name"](${south},${west},${north},${east});
      nwr["amenity"="library"]["name"](${south},${west},${north},${east});
      nwr["office"="coworking"]["name"](${south},${west},${north},${east});
      nwr["amenity"="coworking_space"]["name"](${south},${west},${north},${east});
    );
    out center tags 160;
  `;

  const response = await postOverpassQuery(query);

  if (!response.ok) {
    if (response.status === 429) {
      process.stdout.write(`Overpass rate-limited ${city.name}; waiting and retrying once...\n`);
      await delay(10_000);
      const retryResponse = await postOverpassQuery(query);
      if (!retryResponse.ok) {
        process.stdout.write(`Skipping ${city.name}: ${retryResponse.status} ${retryResponse.statusText}\n`);
        return [];
      }
      const retryData = await retryResponse.json();
      return Array.isArray(retryData.elements) ? retryData.elements : [];
    }

    throw new Error(`Overpass request failed for ${city.name}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data.elements) ? data.elements : [];
}

async function postOverpassQuery(query) {
  return fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "Lumen location lead research (admin review)",
    },
    body: new URLSearchParams({ data: query }),
  });
}

function toLead(element, city, exportedAt) {
  const tags = element.tags || {};
  const name = cleanText(tags.name);
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;

  if (!name || typeof latitude !== "number" || typeof longitude !== "number") return null;

  const workspaceType = inferWorkspaceType(tags);
  const address = formatAddress(tags);
  const website = cleanUrl(tags.website || tags["contact:website"]);
  const phone = cleanText(tags.phone || tags["contact:phone"]);
  const importScore = getImportScore(tags, workspaceType);

  return {
    source: "openstreetmap",
    source_id: `${element.type}/${element.id}`,
    source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    imported_at: exportedAt,
    import_score: importScore,
    needs_review: true,
    suggested_status: "pending",
    name,
    type: workspaceType,
    city_name: city.name,
    country: city.country,
    country_code: city.country_code,
    address,
    latitude: Number(latitude.toFixed(7)),
    longitude: Number(longitude.toFixed(7)),
    website,
    phone,
    opening_hours: cleanText(tags.opening_hours),
    has_wifi: hasPositiveTag(tags.internet_access) || hasPositiveTag(tags.wifi),
    has_power_outlets: inferPower(tags),
    has_coffee: tags.amenity === "cafe" || hasPositiveTag(tags.coffee),
    has_food: hasPositiveTag(tags.food) || hasPositiveTag(tags.cuisine) || Boolean(tags.cuisine),
    laptop_friendly: inferLaptopFriendly(tags, workspaceType),
    raw_tags: tags,
  };
}

function inferWorkspaceType(tags) {
  if (tags.office === "coworking" || tags.amenity === "coworking_space") return "coworking";
  if (tags.amenity === "library") return "library";
  if (tags.amenity === "restaurant") return "restaurant";
  return "cafe";
}

function inferLaptopFriendly(tags, workspaceType) {
  if (workspaceType === "coworking" || workspaceType === "library") return true;
  if (hasPositiveTag(tags.internet_access) || hasPositiveTag(tags.wifi)) return true;
  return null;
}

function inferPower(tags) {
  const powerTags = [
    tags.power,
    tags.power_outlets,
    tags["socket:typeb"],
    tags["socket:usb"],
    tags["socket"],
  ];
  if (powerTags.some(hasPositiveValue)) return true;
  return null;
}

function getImportScore(tags, workspaceType) {
  let score = 0;
  if (workspaceType === "coworking") score += 5;
  if (workspaceType === "library") score += 4;
  if (hasPositiveTag(tags.internet_access) || hasPositiveTag(tags.wifi)) score += 4;
  if (tags.website || tags["contact:website"]) score += 2;
  if (tags.opening_hours) score += 2;
  if (tags.phone || tags["contact:phone"]) score += 1;
  if (formatAddress(tags)) score += 2;
  if (tags.cuisine || tags.amenity === "cafe") score += 1;
  return score;
}

function formatAddress(tags) {
  const houseNumber = cleanText(tags["addr:housenumber"]);
  const street = cleanText(tags["addr:street"]);
  const unit = cleanText(tags["addr:unit"]);
  const city = cleanText(tags["addr:city"]);
  const state = cleanText(tags["addr:state"]);
  const postcode = cleanText(tags["addr:postcode"]);

  const lineOne = [houseNumber, street].filter(Boolean).join(" ");
  const lineTwo = [unit, city, state, postcode].filter(Boolean).join(", ");
  return [lineOne, lineTwo].filter(Boolean).join(", ") || null;
}

function hasPositiveTag(value) {
  return hasPositiveValue(value);
}

function hasPositiveValue(value) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["yes", "free", "wlan", "wifi", "public", "customers"].includes(value.toLowerCase());
}

function cleanText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanUrl(value) {
  const text = cleanText(value);
  if (!text) return null;
  if (text.startsWith("http://") || text.startsWith("https://")) return text;
  return `https://${text}`;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function delay(ms) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}
