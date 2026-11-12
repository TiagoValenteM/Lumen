import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export function parseCoordinates(lat: string | null, lng: string | null) {
  if (!lat?.trim() || !lng?.trim()) return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export async function guardGeocoding(provider: "geoapify" | "locationiq" | "photon" | "nominatim") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Sign in to look up an address.", 401);

  const service = createServiceClient();
  if (!service) return errorResponse("Address lookup is unavailable. You can still enter the address manually.", 503);
  const { data, error } = await service.rpc("take_geocoding_slot", { requester: user.id, provider_name: provider });
  if (error || typeof data !== "number") {
    console.error("Geocoding quota check failed", { code: error?.code, provider });
    return errorResponse("Address lookup is temporarily unavailable.", 503);
  }
  if (data > 0) return errorResponse("Address lookup limit reached. Try again later or enter the address manually.", 429, data);
  return null;
}

function errorResponse(error: string, status: number, retryAfter?: number) {
  return NextResponse.json({ error }, {
    status,
    headers: { "Cache-Control": "no-store", ...(retryAfter && { "Retry-After": String(retryAfter) }) },
  });
}

export function fetchGeocodingProvider(url: URL, headers?: HeadersInit) {
  return fetch(url, { headers, next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
}
