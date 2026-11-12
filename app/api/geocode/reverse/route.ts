import { NextResponse } from "next/server";
import { fetchGeocodingProvider, parseCoordinates, runGeocodeLookup } from "@/lib/features/locations/geocode-guard";
import type { GeocodeAttempt } from "@/lib/features/locations/geocode-fallback";
import { normalizeCountryName } from "@/lib/features/locations/country-name";

type ReverseLocation = {
  address: string;
  city: string;
  country: string;
  provider: "geoapify" | "locationiq" | "nominatim";
  providerId: string | null;
  confidence: number | null;
  raw: unknown;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coordinates = parseCoordinates(searchParams.get("lat"), searchParams.get("lng"));
  if (!coordinates) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const { latitude, longitude } = coordinates;

  const geoapifyKey = process.env.GEOAPIFY_API_KEY?.trim();
  const locationIqKey = process.env.LOCATIONIQ_API_KEY?.trim();
  const attempts: GeocodeAttempt<ReverseLocation>[] = [];

  if (geoapifyKey) attempts.push({ provider: "geoapify", lookup: async () => {
    const url = new URL("https://api.geoapify.com/v1/geocode/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "geojson");
    url.searchParams.set("apiKey", geoapifyKey);

    const response = await fetchGeocodingProvider(url);
    if (!response.ok) throw new Error("Geoapify reverse lookup failed");
    const data = await response.json();
    const feature = data.features?.[0];
    const properties = feature?.properties;
    if (!properties?.formatted) throw new Error("Geoapify returned no address");
    return {
      address: properties.formatted || "",
      city: properties.city || properties.town || properties.village || properties.county || "",
      country: normalizeCountryName(String(properties.country || ""), properties.country_code),
      provider: "geoapify",
      providerId: properties.place_id || null,
      confidence: properties.rank?.confidence ?? null,
      raw: feature,
    };
  } });

  if (locationIqKey) attempts.push({ provider: "locationiq", lookup: async () => {
    const url = new URL("https://api.locationiq.com/v1/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "json");
    url.searchParams.set("key", locationIqKey);

    const response = await fetchGeocodingProvider(url);
    if (!response.ok) throw new Error("LocationIQ reverse lookup failed");
    const data = await response.json();
    const address = data.address || {};
    if (!data.display_name) throw new Error("LocationIQ returned no address");
    return {
      address: data.display_name,
      city: address.city || address.town || address.village || address.county || "",
      country: normalizeCountryName(String(address.country || ""), address.country_code),
      provider: "locationiq",
      providerId: data.place_id || null,
      confidence: typeof data.importance === "number" ? data.importance : null,
      raw: data,
    };
  } });

  attempts.push({ provider: "nominatim", lookup: async () => {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "en");
    url.searchParams.set("zoom", "18");

    const response = await fetchGeocodingProvider(url, {
      Accept: "application/json",
      Referer: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "User-Agent": "Lumen/1.0 (location moderation)",
    });
    if (!response.ok) throw new Error("Nominatim reverse lookup failed");

    const data = await response.json();
    const address = data.address || {};
    if (!data.display_name) throw new Error("Nominatim returned no address");
    return {
      address: data.display_name,
      city: address.city || address.town || address.village || address.municipality || address.county || "",
      country: normalizeCountryName(String(address.country || ""), address.country_code),
      provider: "nominatim",
      providerId: data.osm_type && data.osm_id ? `${data.osm_type}:${data.osm_id}` : data.place_id || null,
      confidence: typeof data.importance === "number" ? data.importance : null,
      raw: data,
    };
  } });

  return runGeocodeLookup(attempts, "Could not look up the address. You can enter it manually.");
}
