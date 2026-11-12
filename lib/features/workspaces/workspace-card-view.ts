import type { Workspace } from "@/lib/types";
import { isLaptopReadyWorkspace, isLongStayWorkspace } from "./work-facts";

type WorkspaceCardData = Pick<
  Workspace,
  | "has_coffee"
  | "has_power_outlets"
  | "has_wifi"
  | "laptop_friendly"
  | "music_volume"
  | "noise_level"
  | "time_limit_hours"
  | "work_facts_checked_at"
  | "good_for_calls"
  | "good_for_meetings"
  | "good_for_groups"
>;

export function getWorkspaceCardVibes(workspace: WorkspaceCardData) {
  const vibes: string[] = [];

  if (isDeepWorkWorkspace(workspace)) vibes.push("Deep work");
  if (workspace.good_for_calls) vibes.push("Call-friendly");
  if (workspace.good_for_meetings || workspace.good_for_groups) vibes.push("Social");
  if (isLongStayWorkspace(workspace)) vibes.push("Long stay");

  if (vibes.length === 0 && isLaptopReadyWorkspace(workspace)) {
    vibes.push("Laptops welcome");
  }

  return vibes.slice(0, 3);
}

export function isDeepWorkWorkspace(workspace: WorkspaceCardData) {
  return workspace.noise_level === "quiet" ||
    (typeof workspace.music_volume === "number" && workspace.music_volume <= 2);
}
