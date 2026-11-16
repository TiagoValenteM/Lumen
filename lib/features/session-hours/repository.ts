import type { SupabaseClient } from "@supabase/supabase-js";
import type { VenueSessionSchedule } from "../find-a-spot/session-availability";
import type { SessionHoursPayload } from "./editor";

export type SessionHoursRecord = {
  draft: SessionHoursPayload | null;
  published: SessionHoursPayload | null;
  checked_at: string | null;
  revision: number | null;
};
export type SessionEvidence = {
  schedule: VenueSessionSchedule;
  source: string;
  laptopSource: string;
  note: string;
  maxMinutes?: number;
  checkedAt?: string;
};
export type PlaceSnapshot = { name: string; address: string | null; cityId: string | null; latitude: number | null; longitude: number | null };
export type HoursAction = "draft" | "verify" | "withdraw";

export async function readSessionHours(client: SupabaseClient, workspaceId: string, signal: AbortSignal) {
  const { data, error } = await client.rpc("read_workspace_session_hours", { workspace_uuid: workspaceId }).abortSignal(signal);
  if (error) throw error;
  return data as SessionHoursRecord;
}

export async function updateSessionHours(client: SupabaseClient, workspaceId: string, revision: number | null,
  place: PlaceSnapshot, action: HoursAction, schedule: SessionHoursPayload | null) {
  const { data, error } = await client.rpc("update_workspace_session_hours", {
    workspace_uuid: workspaceId, expected_revision: revision, expected_place: place, action, schedule,
  });
  if (error) throw error;
  return data as SessionHoursRecord;
}

export async function readCitySessionHours(client: SupabaseClient, cityId: string, signal: AbortSignal) {
  const result = new Map<string, SessionEvidence>();
  const { data, error } = await client.from("workspace_session_hours")
    .select("workspace_id,published,checked_at,workspaces!inner(city_id)").eq("workspaces.city_id", cityId).abortSignal(signal);
  if (error) return result;
  for (const { workspace_id, published, checked_at } of data) {
    const payload = published as SessionHoursPayload | null;
    if (!payload || !checked_at) continue;
    result.set(workspace_id, {
      source: payload.opening.source, laptopSource: payload.laptopAccess.source, note: payload.note,
      maxMinutes: payload.laptopAccess.maxSessionMinutes,
      checkedAt: checked_at,
      schedule: { timeZone: payload.timeZone, opening: { ...payload.opening, checkedAt: checked_at },
        laptopAccess: { ...payload.laptopAccess, checkedAt: checked_at } },
    });
  }
  return result;
}
