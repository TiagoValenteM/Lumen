import { NextResponse } from "next/server";

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
      "Cache-Control": "private, max-age=300",
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
  const country = String(properties.country || "");
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
  const country = String(address?.country || "");
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
  const country = String(properties.country || "");
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

  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lng"));
  const countryCode = searchParams.get("country")?.trim().toLowerCase();
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  const locationIqKey = process.env.LOCATIONIQ_API_KEY;

  if (geoapifyKey) {
    const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    url.searchParams.set("text", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("format", "geojson");
    url.searchParams.set("apiKey", geoapifyKey);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
    } else if (countryCode && /^[a-z]{2}$/.test(countryCode)) {
      url.searchParams.set("bias", `countrycode:${countryCode}`);
    }

    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return json({ results: [], error: "Geocoding provider failed" }, 502);
    const data = await response.json();
    const results = ((data.features || []) as Record<string, unknown>[])
      .map(normalizeGeoapify)
      .filter(Boolean);
    return json({ results });
  }

  if (locationIqKey) {
    const url = new URL("https://api.locationiq.com/v1/autocomplete");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("dedupe", "1");
    url.searchParams.set("format", "json");
    url.searchParams.set("key", locationIqKey);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      url.searchParams.set("viewbox", `${longitude - 0.5},${latitude + 0.5},${longitude + 0.5},${latitude - 0.5}`);
      url.searchParams.set("bounded", "0");
    }

    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return json({ results: [], error: "Geocoding provider failed" }, 502);
    const data = await response.json();
    const results = (data as Record<string, unknown>[])
      .map(normalizeLocationIq)
      .filter(Boolean);
    return json({ results });
  }

  const photonBaseUrl = process.env.PHOTON_API_URL || "https://photon.komoot.io";
  const url = new URL("/api", photonBaseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Referer: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "User-Agent": "Lumen/1.0 (place submission search)",
      },
      next: { revalidate: 300 },
    });
    if (!response.ok) return json({ results: [], error: "Open geocoding fallback failed" }, 502);

    const data = await response.json();
    const results = ((data.features || []) as Record<string, unknown>[])
      .map(normalizePhoton)
      .filter(Boolean);
    return json({ results, provider: "photon" });
  } catch {
    return json({
      results: [],
      error: "Location search failed. Add GEOAPIFY_API_KEY or LOCATIONIQ_API_KEY for a more reliable provider.",
    }, 502);
  }
}
