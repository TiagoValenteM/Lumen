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

  if (!missingRpc) throw new Error(formatSupabaseError(error, "Could not merge city."));

  const { data: target, error: targetError } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", normalizedTargetSlug)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) throw new Error("Target city slug was not found.");

  const { error: moveError } = await supabase.from("workspaces").update({ city_id: target.id }).eq("city_id", sourceCityId);
  if (moveError) throw new Error(formatSupabaseError(moveError, "Could not move city workspaces."));

  await supabase.rpc("delete_city_if_empty", { city_uuid: sourceCityId });
  return true;
}

export async function deleteCityIfEmpty(supabase: SupabaseClient, cityId: string) {
  const { data, error } = await supabase.rpc("delete_city_if_empty", { city_uuid: cityId });
  if (!error) return Boolean(data);

  if (!isMissingRpcError(error)) {
    throw new Error(formatSupabaseError(error, "Could not delete city."));
  }

  const { data: workspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("city_id", cityId)
    .limit(1);
  if (workspaceError) throw new Error(formatSupabaseError(workspaceError, "Could not check city workspaces."));
  if (workspaces && workspaces.length > 0) return false;

  const { data: deletedCity, error: deleteError } = await supabase
    .from("cities")
    .delete()
    .eq("id", cityId)
    .or("featured.is.false,featured.is.null")
    .select("id")
    .maybeSingle();
  if (deleteError) {
    throw new Error(getCityDeletePermissionMessage(deleteError));
  }

  return Boolean(deletedCity);
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return error.code === "PGRST202" ||
    error.message?.toLowerCase().includes("could not find the function");
}

function getCityDeletePermissionMessage(error: { code?: string; details?: string; hint?: string; message?: string }) {
  const raw = formatSupabaseError(error, "Could not delete city.");
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("policy")
  ) {
    return "City deletion is blocked by Supabase permissions. Apply migration supabase/migrations/20260605_fix_admin_city_delete.sql, then try again.";
  }

  return raw;
}

function formatSupabaseError(
  error: { code?: string; details?: string; hint?: string; message?: string } | null | undefined,
  fallback: string
) {
  if (!error) return fallback;

  const parts = [error.message, error.details, error.hint, error.code]
    .filter((part): part is string => Boolean(part?.trim()));

  return parts.length > 0 ? parts.join(" ") : fallback;
}
