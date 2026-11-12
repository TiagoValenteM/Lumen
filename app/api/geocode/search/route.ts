import { NextResponse } from "next/server";
import { fetchGeocodingProvider, parseCoordinates, runGeocodeLookup } from "@/lib/features/locations/geocode-guard";
import type { GeocodeAttempt } from "@/lib/features/locations/geocode-fallback";
import { normalizeCountryName } from "@/lib/features/locations/country-name";

type GeocodeCandidate = {
  id: string;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  provider: "geoapify" | "locationiq" | "photon";
  providerId: string | null;
  confidence: number | null;
  raw: unknown;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": status === 200 ? "private, max-age=300" : "no-store",
    },
  });
}

function normalizeGeoapify(feature: Record<string, unknown>): GeocodeCandidate | null {
  const properties = feature.properties as Record<string, unknown> | undefined;
  const geometry = feature.geometry as { coordinates?: [number, number] } | undefined;
  if (!properties || !geometry?.coordinates) return null;
  const [longitude, latitude] = geometry.coordinates;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;

  const city = String(properties.city || properties.town || properties.village || properties.county || "");
  const country = normalizeCountryName(String(properties.country || ""), properties.country_code);
  const label = String(properties.formatted || [properties.name, city, country].filter(Boolean).join(", "));
  const rank = properties.rank as Record<string, unknown> | undefined;

  return {
    id: `geoapify:${String(properties.place_id || label)}`,
    label,
    address: label,
    city,
    country,
    latitude,
    longitude,
    provider: "geoapify",
    providerId: properties.place_id ? String(properties.place_id) : null,
    confidence: rank?.confidence === undefined ? null : Number(rank.confidence),
    raw: feature,
  };
}

function normalizeLocationIq(item: Record<string, unknown>): GeocodeCandidate | null {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const address = item.address as Record<string, unknown> | undefined;
  const city = String(address?.city || address?.town || address?.village || address?.county || "");
  const country = normalizeCountryName(String(address?.country || ""), address?.country_code);
  const label = String(item.display_name || [item.name, city, country].filter(Boolean).join(", "));

  return {
    id: `locationiq:${String(item.place_id || label)}`,
    label,
    address: label,
    city,
    country,
    latitude,
    longitude,
    provider: "locationiq",
    providerId: item.place_id ? String(item.place_id) : null,
    confidence: typeof item.importance === "number" ? item.importance : null,
    raw: item,
  };
}

function normalizePhoton(feature: Record<string, unknown>): GeocodeCandidate | null {
  const properties = feature.properties as Record<string, unknown> | undefined;
  const geometry = feature.geometry as { coordinates?: [number, number] } | undefined;
  if (!properties || !geometry?.coordinates) return null;

  const [longitude, latitude] = geometry.coordinates;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;

  const name = String(properties.name || "");
  const houseNumber = String(properties.housenumber || "");
  const street = String(properties.street || "");
  const postcode = String(properties.postcode || "");
  const city = String(properties.city || properties.district || properties.county || "");
  const country = normalizeCountryName(String(properties.country || ""), properties.countrycode);
  const streetAddress = [houseNumber, street].filter(Boolean).join(" ");
  const label = [name, streetAddress, postcode, city, country].filter(Boolean).join(", ");
  const address = [streetAddress, postcode, city, country].filter(Boolean).join(", ") || label;
  const osmType = properties.osm_type ? String(properties.osm_type) : null;
  const osmId = properties.osm_id ? String(properties.osm_id) : null;

  return {
    id: `photon:${osmType || "place"}:${osmId || label}`,
    label,
    address,
    city,
    country,
    latitude,
    longitude,
    provider: "photon",
    providerId: osmType && osmId ? `${osmType}:${osmId}` : null,
    confidence: typeof properties.extent === "object" ? 0.8 : null,
    raw: feature,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query || query.length < 3) return json({ results: [] });
  if (query.length > 200) return json({ error: "The address search is too long." }, 400);

  const coordinates = parseCoordinates(searchParams.get("lat"), searchParams.get("lng"));
  const countryCode = searchParams.get("country")?.trim().toLowerCase();
  const geoapifyKey = process.env.GEOAPIFY_API_KEY?.trim();
  const locationIqKey = process.env.LOCATIONIQ_API_KEY?.trim();
  const attempts: GeocodeAttempt<{ results: GeocodeCandidate[] }>[] = [];

  if (geoapifyKey) attempts.push({ provider: "geoapify", lookup: async () => {
    const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    url.searchParams.set("text", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("format", "geojson");
    url.searchParams.set("apiKey", geoapifyKey);
    if (coordinates) {
      const { latitude, longitude } = coordinates;
      url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
    } else if (countryCode && /^[a-z]{2}$/.test(countryCode)) {
      url.searchParams.set("bias", `countrycode:${countryCode}`);
    }

    const response = await fetchGeocodingProvider(url);
    if (!response.ok) throw new Error("Geoapify lookup failed");
    const data = await response.json();
    return { results: (data.features as Record<string, unknown>[]).map(normalizeGeoapify).filter(isCandidate) };
  } });

  if (locationIqKey) attempts.push({ provider: "locationiq", lookup: async () => {
    const url = new URL("https://api.locationiq.com/v1/autocomplete");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("dedupe", "1");
    url.searchParams.set("format", "json");
    url.searchParams.set("key", locationIqKey);
    if (coordinates) {
      const { latitude, longitude } = coordinates;
      url.searchParams.set("viewbox", `${longitude - 0.5},${latitude + 0.5},${longitude + 0.5},${latitude - 0.5}`);
      url.searchParams.set("bounded", "0");
    }

    const response = await fetchGeocodingProvider(url);
    if (!response.ok) throw new Error("LocationIQ lookup failed");
    const data = await response.json();
    return { results: (data as Record<string, unknown>[]).map(normalizeLocationIq).filter(isCandidate) };
  } });

  attempts.push({ provider: "photon", lookup: async () => {
    const photonBaseUrl = process.env.PHOTON_API_URL || "https://photon.komoot.io";
    const url = new URL("/api", photonBaseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("lang", "en");
    if (coordinates) {
      url.searchParams.set("lat", String(coordinates.latitude));
      url.searchParams.set("lon", String(coordinates.longitude));
    }

    const response = await fetchGeocodingProvider(url, {
      Accept: "application/json",
      Referer: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "User-Agent": "Lumen/1.0 (place submission search)",
    });
    if (!response.ok) throw new Error("Photon lookup failed");
    const data = await response.json();
    return { results: (data.features as Record<string, unknown>[]).map(normalizePhoton).filter(isCandidate) };
  } });

  return runGeocodeLookup(attempts, "Location search is temporarily unavailable. You can still use the map pin.");
}

function isCandidate(candidate: GeocodeCandidate | null): candidate is GeocodeCandidate {
  return candidate !== null;
}
