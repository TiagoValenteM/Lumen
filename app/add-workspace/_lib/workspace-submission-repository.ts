import type { SupabaseClient } from "@supabase/supabase-js";
import type { AddWorkspaceFormData } from "./types";

export const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const buildCitySlug = (city: string, country: string) => {
  const base = slugify(city);
  const countrySuffix = slugify(country);
  return [base, countrySuffix].filter(Boolean).join("-") || "global";
};

export async function findCityByNameAndCountry(supabase: SupabaseClient, cityName: string, country: string) {
  let cityQuery = supabase.from("cities").select("id, slug").ilike("name", cityName).limit(1);
  cityQuery = country ? cityQuery.eq("country", country) : cityQuery.or("country.is.null,country.eq.Unknown");

  const { data, error } = await cityQuery.maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCityForWorkspace(supabase: SupabaseClient, formData: AddWorkspaceFormData, slug: string) {
  const { data, error } = await supabase
    .from("cities")
    .insert({
      name: formData.city_name,
      slug,
      country: formData.country || "Unknown",
      latitude: formData.latitude,
      longitude: formData.longitude,
      workspace_count: 0,
    })
    .select("id, slug")
    .single();

  if (error) throw error;
  return data;
}

export async function createPendingWorkspace(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("workspaces").insert(payload).select("id").single();
  if (error) throw error;
  return data;
}

export async function createPendingWorkspacePhotos(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  uploadedPhotos: string[],
) {
  if (uploadedPhotos.length === 0) return;

  const photoInserts = uploadedPhotos.map((url, index) => ({
    workspace_id: workspaceId,
    user_id: userId,
    url,
    is_primary: index === 0,
    is_approved: false,
  }));

  const { error } = await supabase.from("workspace_photos").insert(photoInserts).select();
  if (error) throw error;
}
