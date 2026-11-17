import type { SupabaseClient } from "@supabase/supabase-js";
import { readWorkspaceCityProposals } from "@/lib/features/locations/workspace-city-proposals";
import { isMissingColumnError, workspaceSelect } from "./admin-workspace-actions";
import type { AiEnrichmentRow, EditSuggestionRow, WorkspaceDetailMinimal, WorkspacePhotoRow, WorkspaceQueryRow } from "./types";

const enrichmentColumns = "id, created_at, updated_at, status, provider, model, run_mode, suggested_fields, field_evidence, unknown_fields, field_decisions, run_metadata, field_sources, citations, error_message";

export async function readAdminAiEnrichments(client: SupabaseClient, id: string, signal?: AbortSignal) {
  const query = client.from("workspace_ai_enrichments").select(enrichmentColumns)
    .eq("workspace_id", id).order("created_at", { ascending: false });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error && !isMissingColumnError(error)) throw error;
  return (data ?? []) as AiEnrichmentRow[];
}

export async function readAdminWorkspace(client: SupabaseClient, id: string, signal: AbortSignal) {
  const readRow = (includeLocationMetadata: boolean) => client.from("workspaces")
    .select(workspaceSelect(includeLocationMetadata)).eq("id", id).abortSignal(signal).maybeSingle();
  let includeLocationMetadata = true;
  let result = await readRow(true);
  if (result.error && isMissingColumnError(result.error)) {
    includeLocationMetadata = false;
    result = await readRow(false);
  }
  if (result.error) throw result.error;
  if (!result.data || signal.aborted) return null;
  const row = result.data as unknown as WorkspaceQueryRow;
  const [notes, proposals, photos, suggestions, enrichments] = await Promise.all([
    client.rpc("get_workspace_admin_notes", { workspace_uuid: id }).abortSignal(signal),
    readWorkspaceCityProposals(client, row.city_id ? [] : [id], signal),
    client.from("workspace_photos").select("id, url, caption, is_primary, is_approved")
      .eq("workspace_id", id).order("is_primary", { ascending: false }).abortSignal(signal),
    client.from("workspace_edit_suggestions").select("id, created_at, kind, message, status")
      .eq("workspace_id", id).order("created_at", { ascending: false }).abortSignal(signal),
    readAdminAiEnrichments(client, id, signal).catch((error: unknown) => {
      if (!signal.aborted) console.warn("Could not load AI enrichment", error);
      return [];
    }),
  ]);
  if (notes.error && notes.error.code !== "PGRST202") throw notes.error;
  if (photos.error) throw photos.error;
  if (suggestions.error && !isMissingColumnError(suggestions.error) && !signal.aborted) {
    console.warn("Could not load edit suggestions", suggestions.error);
  }

  const city = Array.isArray(row.city) ? row.city[0] : row.city;
  const proposal = proposals.get(id) ?? null;
  const workspace: WorkspaceDetailMinimal = {
    ...row,
    submitted_by: row.submitted_by ?? null,
    city_slug: city?.slug ?? null,
    city_proposal: proposal,
    city_name: city?.name ?? proposal?.name ?? null,
    country: city?.country ?? proposal?.country ?? null,
    location_source: includeLocationMetadata ? row.location_source : null,
    location_provider: includeLocationMetadata ? row.location_provider : null,
    location_provider_id: includeLocationMetadata ? row.location_provider_id : null,
    location_confidence: includeLocationMetadata ? row.location_confidence : null,
    location_raw: includeLocationMetadata ? row.location_raw : null,
    rejection_reason: includeLocationMetadata ? row.rejection_reason : null,
    admin_notes: notes.error ? row.admin_notes ?? null : notes.data,
  };
  return {
    workspace, includeLocationMetadata, enrichments,
    photos: (photos.data ?? []) as WorkspacePhotoRow[],
    suggestions: (suggestions.data ?? []) as EditSuggestionRow[],
  };
}
