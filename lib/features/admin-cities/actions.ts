import type { SupabaseClient } from "@supabase/supabase-js";

export async function mergeCityBySlug(supabase: SupabaseClient, sourceCityId: string, targetSlug: string) {
  const normalizedTargetSlug = targetSlug.trim();
  if (!normalizedTargetSlug) {
    throw new Error("Choose a target city slug before merging.");
  }

  const { data, error } = await supabase.rpc("merge_city", {
    source_city_uuid: sourceCityId,
    target_city_slug: normalizedTargetSlug,
  });
  if (!error) return Boolean(data);

  const missingRpc =
    error.code === "PGRST202" ||
    error.message?.toLowerCase().includes("could not find the function");

  if (!missingRpc) throw error;

  const { data: target, error: targetError } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", normalizedTargetSlug)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) throw new Error("Target city slug was not found.");

  const { error: moveError } = await supabase.from("workspaces").update({ city_id: target.id }).eq("city_id", sourceCityId);
  if (moveError) throw moveError;

  await supabase.rpc("delete_city_if_empty", { city_uuid: sourceCityId });
  return true;
}
