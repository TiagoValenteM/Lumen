import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildWorkspaceUpdatePayload,
  isMissingColumnError,
  resolveWorkspaceCity,
  stripLocationMetadataPayload,
} from "./admin-workspace-actions";
import type { AdminWorkspaceFormState, WorkspaceDetailMinimal } from "./types";

export async function saveAdminWorkspace(
  supabase: SupabaseClient,
  workspace: WorkspaceDetailMinimal,
  form: AdminWorkspaceFormState,
  userId: string,
  includeLocationMetadata: boolean,
  stagedAiReview: { id: string; paths: string[] } | null,
) {
  let hasLocationMetadataColumns = includeLocationMetadata;
  const previousCityId = workspace.city_id;
  const proposal = workspace.city_proposal ? { name: form.city_name.trim(), country: form.country.trim() } : null;
  if (proposal && (!proposal.name || !proposal.country)) throw new Error("Enter the proposed city and country before saving.");
  let { cityId, citySlug } = proposal
    ? { cityId: null, citySlug: null }
    : await resolveWorkspaceCity(supabase, form, workspace.city_slug);
  const updatePayload = buildWorkspaceUpdatePayload(form, cityId, userId, hasLocationMetadataColumns);

  if (stagedAiReview) {
    const args = {
      workspace_uuid: workspace.id,
      enrichment_uuid: stagedAiReview.id,
      patch: updatePayload,
      applied_paths: stagedAiReview.paths,
    };
    const { data, error: updateError } = proposal
      ? await supabase.rpc("save_workspace_ai_review_with_city_proposal", { ...args, city_name: proposal.name, country_name: proposal.country })
      : await supabase.rpc("save_workspace_ai_review", args);
    if (updateError) throw new Error(updateError.message);
    if (proposal) {
      cityId = data?.id ?? null;
      citySlug = data?.slug ?? null;
    }
  } else {
    if (proposal) {
      updatePayload.proposed_city_name = proposal.name;
      updatePayload.proposed_city_country = proposal.country;
    }
    const update = (payload: Record<string, unknown>) => supabase.from("workspaces")
      .update(payload).eq("id", workspace.id).select("id, city_id, city:cities(slug)").single();
    let { data, error: updateError } = await update(updatePayload);
    if (updateError && hasLocationMetadataColumns && isMissingColumnError(updateError)) {
      hasLocationMetadataColumns = false;
      ({ data, error: updateError } = await update(stripLocationMetadataPayload(updatePayload)));
    }
    if (updateError) throw new Error(updateError.message);
    if (proposal && data) {
      const city = Array.isArray(data.city) ? data.city[0] : data.city;
      cityId = data.city_id;
      citySlug = city?.slug ?? null;
    }
  }
  if (previousCityId && cityId && previousCityId !== cityId) {
    const { error: cleanupError } = await supabase.rpc("delete_city_if_empty", { city_uuid: previousCityId });
    if (cleanupError) {
      console.warn("Workspace moved, but the old empty city could not be cleaned up", cleanupError);
    }
  }
  if (form.status === "approved") {
    const { error: photoError } = await supabase
      .from("workspace_photos")
      .update({ is_approved: true })
      .eq("workspace_id", workspace.id)
      .is("reviewed_at", null);
    if (photoError) {
      console.warn("Workspace saved, but photos could not be auto-approved", photoError);
    }
  }
  return { cityId, citySlug, hasLocationMetadataColumns, proposal: cityId ? null : proposal };
}
