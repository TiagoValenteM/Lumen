import type { SupabaseClient } from "@supabase/supabase-js";
import type { City } from "@/lib/types";
import { readWorkFactChecks } from "@/lib/features/workspaces/work-fact-checks";
import { normalizeCountryName } from "@/lib/features/locations/country-name";
import type { SpotPlace } from "./matching";

export type SpotCity = Pick<City, "id" | "slug" | "name" | "country">;
const CITY_PLACE_LIMIT = 250;

export async function loadSpotCities(supabase: SupabaseClient, signal: AbortSignal): Promise<SpotCity[]> {
  const { data, error } = await supabase.from("cities").select("id,slug,name,country,country_code")
    .gt("workspace_count", 0).order("country").order("name").abortSignal(signal);
  if (error) throw error;
  return data.map(({ country_code, ...city }) => ({ ...city, country: normalizeCountryName(city.country, country_code) }));
}

export async function loadSpotPlaces(supabase: SupabaseClient, cityId: string, signal: AbortSignal): Promise<{ places: SpotPlace[]; limited: boolean }> {
  const [{ data, error }, checks] = await Promise.all([
    supabase.from("workspaces").select(`
      id,slug,name,type,address,latitude,longitude,laptop_friendly,time_limit_hours,
      has_wifi,has_power_outlets,noise_level,good_for_calls,workspace_photos!workspace_id(url,is_primary,is_approved)
    `).eq("city_id", cityId).eq("status", "approved").order("id").limit(CITY_PLACE_LIMIT + 1).abortSignal(signal),
    readWorkFactChecks(supabase, { cityId }, signal),
  ]);
  if (error) throw error;
  return {
    limited: data.length > CITY_PLACE_LIMIT,
    places: data.slice(0, CITY_PLACE_LIMIT).map(({ workspace_photos, ...place }) => {
      const photos = workspace_photos?.filter((photo) => photo.is_approved) ?? [];
      return { ...place, checkedAt: checks.get(place.id) ?? null, photoUrl: (photos.find((photo) => photo.is_primary) ?? photos[0])?.url ?? null };
    }),
  };
}
