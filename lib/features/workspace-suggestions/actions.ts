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

  const rpcCanFallback =
    missingRpc ||
    error.code === "42703" ||
    error.message?.toLowerCase().includes("reported_change_count") ||
    error.message?.toLowerCase().includes("workspace_edit_suggestions");

  if (!rpcCanFallback) throw error;

  const { error: insertError } = await supabase.from("workspace_edit_suggestions").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    kind: input.kind,
    field: input.kind,
    current_value: "",
    proposed_value: input.message,
    message: input.message,
    status: "open",
  });
  if (insertError) throw new Error(formatSuggestionError(insertError));

  return null;
}

function formatSuggestionError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" | ") || "Could not submit suggestion.";
}
