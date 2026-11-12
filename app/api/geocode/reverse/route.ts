import { NextResponse } from "next/server";
import { fetchGeocodingProvider, guardGeocoding, parseCoordinates } from "@/lib/features/locations/geocode-guard";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": status === 200 ? "private, max-age=300" : "no-store",
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coordinates = parseCoordinates(searchParams.get("lat"), searchParams.get("lng"));
  if (!coordinates) {
    return json({ error: "Invalid coordinates" }, 400);
  }
  const { latitude, longitude } = coordinates;

  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  const locationIqKey = process.env.LOCATIONIQ_API_KEY;
  const denied = await guardGeocoding(geoapifyKey ? "geoapify" : locationIqKey ? "locationiq" : "nominatim");
  if (denied) return denied;

  try {
    return await reverseGeocode(latitude, longitude, geoapifyKey, locationIqKey);
  } catch {
    return json({ error: "Address lookup failed. You can enter the address manually." }, 502);
  }
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
  geoapifyKey: string | undefined,
  locationIqKey: string | undefined,
) {
  if (geoapifyKey) {
    const url = new URL("https://api.geoapify.com/v1/geocode/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "geojson");
    url.searchParams.set("apiKey", geoapifyKey);

    const response = await fetchGeocodingProvider(url);
    if (!response.ok) return json({ error: "Reverse geocoding provider failed" }, 502);
    const data = await response.json();
    const feature = data.features?.[0];
    const properties = feature?.properties || {};
    return json({
      address: properties.formatted || "",
      city: properties.city || properties.town || properties.village || properties.county || "",
      country: properties.country || "",
      provider: "geoapify",
      providerId: properties.place_id || null,
      confidence: properties.rank?.confidence ?? null,
      raw: feature || null,
    });
  }

  if (locationIqKey) {
    const url = new URL("https://api.locationiq.com/v1/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "json");
    url.searchParams.set("key", locationIqKey);

    const response = await fetchGeocodingProvider(url);
    if (!response.ok) return json({ error: "Reverse geocoding provider failed" }, 502);
    const data = await response.json();
    const address = data.address || {};
    return json({
      address: data.display_name || "",
      city: address.city || address.town || address.village || address.county || "",
      country: address.country || "",
      provider: "locationiq",
      providerId: data.place_id || null,
      confidence: typeof data.importance === "number" ? data.importance : null,
      raw: data,
    });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  const response = await fetchGeocodingProvider(url, {
    Accept: "application/json",
    Referer: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "User-Agent": "Lumen/1.0 (location moderation)",
  });
  if (!response.ok) throw new Error("Nominatim reverse geocoding failed");

  const data = await response.json();
  const address = data.address || {};
  return json({
      address: data.display_name || "",
      city:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        "",
      country: address.country || "",
      provider: "nominatim",
      providerId: data.osm_type && data.osm_id ? `${data.osm_type}:${data.osm_id}` : data.place_id || null,
      confidence: typeof data.importance === "number" ? data.importance : null,
      raw: data,
  });
}
