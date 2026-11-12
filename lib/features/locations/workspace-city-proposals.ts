import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceCityProposal = { name: string; country: string };

export async function readWorkspaceCityProposals(supabase: SupabaseClient, workspaceIds: string[]) {
  const proposals = new Map<string, WorkspaceCityProposal>();
  if (!workspaceIds.length) return proposals;

  const { data, error } = await supabase.from("workspaces")
    .select("id, proposed_city_name, proposed_city_country")
    .in("id", workspaceIds);
  if (error) {
    // The earlier security rollout can run without this feature migration.
    if (error.code === "42703" || error.code === "PGRST204") return proposals;
    throw error;
  }

  for (const row of data ?? []) {
    if (row.proposed_city_name && row.proposed_city_country) {
      proposals.set(row.id, { name: row.proposed_city_name, country: row.proposed_city_country });
    }
  }
  return proposals;
}
