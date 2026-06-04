import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCitySlug,
  createCityForWorkspace,
  createPendingWorkspace,
  createPendingWorkspacePhotos,
  findCityByNameAndCountry,
} from "./workspace-submission-repository";
import { buildWorkspaceSubmissionPayload } from "./workspace-submission-mapper";
import type { AddWorkspaceFormData } from "./types";

async function resolveCity(supabase: SupabaseClient, formData: AddWorkspaceFormData) {
  let cityId = formData.city_id;
  let nextCitySlug = formData.city_name ? buildCitySlug(formData.city_name, formData.country) : "global";

  if (!cityId && formData.city_name) {
    const existingCity = await findCityByNameAndCountry(supabase, formData.city_name, formData.country);

    if (existingCity) {
      cityId = existingCity.id;
      nextCitySlug = existingCity.slug;
    } else {
      const newCity = await createCityForWorkspace(supabase, formData, nextCitySlug);
      cityId = newCity.id;
      nextCitySlug = newCity.slug;
    }
  }

  return { cityId: cityId ?? null, citySlug: nextCitySlug };
}

export async function submitWorkspace(
  supabase: SupabaseClient,
  formData: AddWorkspaceFormData,
  uploadedPhotos: string[],
  userId: string,
) {
  const { cityId, citySlug } = await resolveCity(supabase, formData);
  const workspacePayload = buildWorkspaceSubmissionPayload(formData, cityId, userId);

  const workspace = await createPendingWorkspace(supabase, workspacePayload);

  await createPendingWorkspacePhotos(supabase, workspace.id, userId, uploadedPhotos);
  return { workspaceId: workspace.id, citySlug };
}
