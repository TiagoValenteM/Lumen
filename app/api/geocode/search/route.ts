import { NextResponse } from "next/server";

type GeocodeCandidate = {
  id: string;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  provider: "geoapify" | "locationiq";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query || query.length < 3) return json({ results: [] });

  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  const locationIqKey = process.env.LOCATIONIQ_API_KEY;

  if (geoapifyKey) {
    const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    url.searchParams.set("text", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("format", "geojson");
    url.searchParams.set("apiKey", geoapifyKey);

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

    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return json({ results: [], error: "Geocoding provider failed" }, 502);
    const data = await response.json();
    const results = (data as Record<string, unknown>[])
      .map(normalizeLocationIq)
      .filter(Boolean);
    return json({ results });
  }

  return json({
    results: [],
    error: "No geocoding provider configured. Add GEOAPIFY_API_KEY or LOCATIONIQ_API_KEY.",
  });
}
