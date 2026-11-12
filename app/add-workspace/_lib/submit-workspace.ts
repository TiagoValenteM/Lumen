import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCountryName } from "@/lib/features/locations/country-name";
import { buildWorkspaceSubmissionPayload } from "./workspace-submission-mapper";
import type { AddWorkspaceFormData } from "./types";

export async function submitWorkspace(
  supabase: SupabaseClient,
  formData: AddWorkspaceFormData,
  uploadedPhotos: string[],
  submissionId: string,
) {
  const { data, error } = await supabase.rpc("submit_workspace_with_photos", {
    submission_uuid: submissionId,
    city_name: formData.city_name,
    country_name: normalizeCountryName(formData.country),
    details: buildWorkspaceSubmissionPayload(formData),
    photo_urls: uploadedPhotos,
  });
  if (error) {
    if (error.code === "22023") throw new Error(error.message);
    console.error("Workspace submission failed", { code: error.code, message: error.message });
    throw new Error("Could not submit your place. Your draft is still available. Please try again.");
  }
  if (typeof data !== "string") throw new Error("Could not confirm the submission. Please try again.");
  return data;
}
