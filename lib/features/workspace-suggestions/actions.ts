import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceSuggestionKind =
  | "wrong_location"
  | "closed_place"
  | "incorrect_amenities"
  | "bad_photo"
  | "duplicate"
  | "other";

type SubmitWorkspaceSuggestionInput = {
  workspaceId: string;
  userId: string;
  kind: WorkspaceSuggestionKind;
  message: string;
};

export async function submitWorkspaceSuggestion(
  supabase: SupabaseClient,
  input: SubmitWorkspaceSuggestionInput,
) {
  const { data, error } = await supabase.rpc("submit_workspace_edit_suggestion", {
    workspace_uuid: input.workspaceId,
    suggestion_kind: input.kind,
    suggestion_message: input.message,
  });

  if (!error) return data as { suggestion_id: string; reported_change_count: number } | null;

  const missingRpc =
    error.code === "PGRST202" ||
    error.message?.toLowerCase().includes("could not find the function");

  if (!missingRpc) throw error;

  const { error: insertError } = await supabase.from("workspace_edit_suggestions").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    kind: input.kind,
    message: input.message,
  });
  if (insertError) throw insertError;

  return null;
}
