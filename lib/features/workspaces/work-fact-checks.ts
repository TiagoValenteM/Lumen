import type { SupabaseClient } from "@supabase/supabase-js";

type WorkFactCheckRow = { workspace_id: string; checked_at: string };

export async function readWorkFactChecks(supabase: SupabaseClient, scope: { workspaceId: string } | { cityId: string }, signal?: AbortSignal) {
  const query = "workspaceId" in scope
    ? supabase.from("workspace_work_fact_checks").select("workspace_id, checked_at").eq("workspace_id", scope.workspaceId)
    : supabase.from("workspace_work_fact_checks").select("workspace_id, checked_at, workspaces!inner(city_id)")
        .eq("workspaces.city_id", scope.cityId);
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) {
    // The previous release does not have this table; show no check until migrated.
    if (!signal?.aborted && error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn("Could not read work fact checks", { code: error.code });
    }
    return new Map<string, string>();
  }
  return new Map((data as WorkFactCheckRow[] | null)?.map((row) => [row.workspace_id, row.checked_at]));
}
