import { NextResponse } from "next/server";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lng"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return json({ error: "Invalid coordinates" }, 400);
  }

  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  const locationIqKey = process.env.LOCATIONIQ_API_KEY;

  if (geoapifyKey) {
    const url = new URL("https://api.geoapify.com/v1/geocode/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "geojson");
    url.searchParams.set("apiKey", geoapifyKey);

    const response = await fetch(url, { next: { revalidate: 300 } });
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

    const response = await fetch(url, { next: { revalidate: 300 } });
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

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Referer: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "User-Agent": "Lumen/1.0 (location moderation)",
      },
      next: { revalidate: 300 },
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
  } catch {
    return json({
      address: "",
      city: "",
      country: "",
      provider: "manual",
      providerId: null,
      confidence: null,
      raw: null,
    });
  }
}
