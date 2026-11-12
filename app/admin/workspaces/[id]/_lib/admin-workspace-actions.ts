import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCountryName } from "@/lib/features/locations/country-name";
import type { AdminWorkspaceFormState, WorkspacePhotoRow } from "./types";

export const STATUS_OPTIONS = ["pending", "under_review", "approved", "rejected"];
export const WORKSPACE_TYPE_OPTIONS = [
  { value: "cafe", label: "Cafe" },
  { value: "coworking", label: "Coworking Space" },
  { value: "hotel_lobby", label: "Hotel Lobby" },
  { value: "library", label: "Library" },
  { value: "restaurant", label: "Restaurant" },
  { value: "other", label: "Other" },
];

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const citySlug = (city: string, country: string) => {
  const base = slugify(city);
  const countrySuffix = slugify(country);
  return [base, countrySuffix].filter(Boolean).join("-") || "global";
};

const locationMetadataColumns = `
          location_source,
          location_provider,
          location_provider_id,
          location_confidence,
          location_raw,
          rejection_reason,
          admin_notes,
`;

export const workspaceSelect = (includeLocationMetadata: boolean) => `
          id,
          created_at,
          name,
          slug,
          type,
          status,
          description,
          short_description,
          address,
          city_id,
          latitude,
          longitude,
          has_wifi,
          wifi_speed,
          has_power_outlets,
          power_outlet_availability,
          seating_capacity,
          seating_comfort,
          has_outdoor_seating,
          has_standing_desks,
          noise_level,
          music_volume,
          has_natural_light,
          has_air_conditioning,
          has_heating,
          has_restrooms,
          has_parking,
          has_bike_parking,
          is_accessible,
          allows_pets,
          has_food,
          has_veg,
          has_coffee,
          has_alcohol,
          price_range,
          laptop_friendly,
          time_limit_hours,
          minimum_purchase_required,
          good_for_meetings,
          good_for_calls,
          good_for_groups,
          overall_rating,
          productivity_rating,
          comfort_rating,
          service_rating,
          total_reviews,
          website,
          phone,
          ${includeLocationMetadata ? locationMetadataColumns : ""}
          submitted_by,
          city:cities(slug, name, country)
        `;

export const isMissingColumnError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42703" ||
    candidate.code === "PGRST204" ||
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    Boolean(candidate.message?.toLowerCase().includes("could not find") && candidate.message.includes("column")) ||
    Boolean(candidate.message?.toLowerCase().includes("workspace_ai_enrichments"))
  );
};

export async function resolveWorkspaceCity(
  supabase: SupabaseClient,
  form: AdminWorkspaceFormState,
  fallbackCitySlug: string | null,
) {
  let cityId = form.city_id;
  let nextCitySlug = fallbackCitySlug;

  if (!form.city_name) {
    return { cityId, citySlug: nextCitySlug };
  }

  let cityQuery = supabase
    .from("cities")
    .select("id, slug, country")
    .ilike("name", form.city_name);

  const country = normalizeCountryName(form.country);
  if (country !== "Switzerland") {
    cityQuery = country ? cityQuery.eq("country", country) : cityQuery.or("country.is.null,country.eq.Unknown");
  }
  const { data: candidates, error: cityFetchError } = await cityQuery.order("id");
  if (cityFetchError) throw cityFetchError;
  const matching = country === "Switzerland"
    ? candidates.filter((city) => normalizeCountryName(city.country ?? "") === country)
    : candidates;
  const existingCity = matching.find((city) => city.id === form.city_id) ?? matching[0];

  if (existingCity) {
    cityId = existingCity.id;
    nextCitySlug = existingCity.slug;
    return { cityId, citySlug: nextCitySlug };
  }

  const { data: newCity, error: cityInsertError } = await supabase
    .from("cities")
    .insert({
      name: form.city_name,
      slug: citySlug(form.city_name, country),
      country: country || "Unknown",
      latitude: form.latitude,
      longitude: form.longitude,
      workspace_count: 0,
    })
    .select("id, slug")
    .single();
  if (cityInsertError) throw cityInsertError;

  return { cityId: newCity.id, citySlug: newCity.slug };
}

export function buildWorkspaceUpdatePayload(
  form: AdminWorkspaceFormState,
  cityId: string | null,
  userId: string,
  includeLocationMetadata: boolean,
) {
  const updatePayload: Record<string, unknown> = {
    name: form.name,
    type: form.type || "cafe",
    short_description: form.short_description,
    description: form.description,
    address: form.address,
    website: form.website || null,
    phone: form.phone || null,
    city_id: cityId,
    latitude: form.latitude,
    longitude: form.longitude,
    status: form.status,
    has_wifi: form.has_wifi,
    wifi_speed: form.has_wifi ? form.wifi_speed || null : null,
    has_power_outlets: form.has_power_outlets,
    power_outlet_availability: form.has_power_outlets ? form.power_outlet_availability || null : null,
    seating_capacity: form.seating_capacity || null,
    seating_comfort: form.seating_comfort || null,
    has_outdoor_seating: form.has_outdoor_seating,
    has_standing_desks: form.has_standing_desks,
    noise_level: form.noise_level || null,
    music_volume: form.music_volume || null,
    has_natural_light: form.has_natural_light,
    has_air_conditioning: form.has_air_conditioning,
    has_heating: form.has_heating,
    has_restrooms: form.has_restrooms,
    has_parking: form.has_parking,
    has_bike_parking: form.has_bike_parking,
    is_accessible: form.is_accessible,
    allows_pets: form.allows_pets,
    has_food: form.has_food,
    has_veg: form.has_veg,
    has_coffee: form.has_coffee,
    has_alcohol: form.has_alcohol,
    price_range: form.price_range || null,
    laptop_friendly: form.laptop_friendly,
    time_limit_hours: form.time_limit_hours,
    minimum_purchase_required: form.minimum_purchase_required,
    good_for_meetings: form.good_for_meetings,
    good_for_calls: form.good_for_calls,
    good_for_groups: form.good_for_groups,
  };

  if (includeLocationMetadata) {
    updatePayload.location_source = form.location_source;
    updatePayload.location_provider = form.location_provider;
    updatePayload.location_provider_id = form.location_provider_id;
    updatePayload.location_confidence = form.location_confidence;
    updatePayload.location_raw = form.location_raw;
    updatePayload.rejection_reason =
      form.status === "rejected" || form.status === "under_review" ? form.rejection_reason || null : null;
    updatePayload.admin_notes = form.admin_notes || null;
    updatePayload.last_verified_at = form.status === "approved" ? new Date().toISOString() : null;
    updatePayload.verified_by = form.status === "approved" ? userId : null;
  }

  return updatePayload;
}

export function stripLocationMetadataPayload(updatePayload: Record<string, unknown>) {
  const fallbackPayload = { ...updatePayload };
  delete fallbackPayload.location_source;
  delete fallbackPayload.location_provider;
  delete fallbackPayload.location_provider_id;
  delete fallbackPayload.location_confidence;
  delete fallbackPayload.location_raw;
  delete fallbackPayload.rejection_reason;
  delete fallbackPayload.admin_notes;
  delete fallbackPayload.last_verified_at;
  delete fallbackPayload.verified_by;
  return fallbackPayload;
}

export async function updateWorkspacePhoto(
  supabase: SupabaseClient,
  photoId: string,
  reviewerId: string,
  next: Partial<WorkspacePhotoRow>,
) {
  const payload: Record<string, unknown> = { ...next, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() };
  if (next.is_approved) payload.rejection_reason = null;
  const { error } = await supabase.from("workspace_photos").update(payload).eq("id", photoId);
  if (error) throw error;
}

export async function createWorkspacePhoto(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  url: string,
  isPrimary: boolean,
) {
  const { data, error } = await supabase
    .from("workspace_photos")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      url,
      is_primary: isPrimary,
      is_approved: true,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .select("id, url, caption, is_primary, is_approved")
    .single();

  if (error) throw error;
  return data as WorkspacePhotoRow;
}

export async function deleteWorkspacePhoto(
  supabase: SupabaseClient,
  photoId: string,
) {
  const { data, error } = await supabase.rpc("delete_workspace_photo", { photo_uuid: photoId });
  if (error) throw error;
  return Boolean(data);
}

export async function deleteWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
) {
  const { data, error } = await supabase.rpc("delete_workspace", { workspace_uuid: workspaceId });
  if (error) throw error;
  return Boolean(data);
}

export async function deleteWorkspacePhotoStorageObject(supabase: SupabaseClient, imageUrl: string) {
  const storagePath = getWorkspacePhotoStoragePath(imageUrl);
  if (!storagePath) return;

  const { error } = await supabase.storage.from("workspace-photos").remove([storagePath]);
  if (error) throw error;
}

function getWorkspacePhotoStoragePath(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    const marker = "/storage/v1/object/public/workspace-photos/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export async function setWorkspacePrimaryPhoto(
  supabase: SupabaseClient,
  workspaceId: string,
  photoId: string,
) {
  const { error: clearError } = await supabase
    .from("workspace_photos")
    .update({ is_primary: false })
    .eq("workspace_id", workspaceId);
  if (clearError) throw clearError;

  const { error: primaryError } = await supabase.from("workspace_photos").update({ is_primary: true }).eq("id", photoId);
  if (primaryError) throw primaryError;
}
