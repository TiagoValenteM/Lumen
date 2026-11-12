import type { WorkspaceDetail } from "@/lib/types";
import { isLaptopReadyWorkspace, isLongStayWorkspace } from "./work-facts";

export type WorkabilityReport = {
  bestFor: string[];
  notes: string[];
};

export function getWorkabilityReport(workspace: WorkspaceDetail): WorkabilityReport {
  const bestFor: string[] = [];
  if (workspace.noise_level === "quiet") bestFor.push("Deep work");
  if (workspace.good_for_calls) bestFor.push("Calls");
  if (workspace.good_for_meetings) bestFor.push("Meetings");
  if (workspace.good_for_groups) bestFor.push("Groups");
  if (isLongStayWorkspace(workspace)) bestFor.push("Long stays");
  if (!bestFor.length && isLaptopReadyWorkspace(workspace)) bestFor.push("Laptop sessions");

  const notes: string[] = [];
  if (workspace.minimum_purchase_required) notes.push("A purchase may be expected while working.");
  if (workspace.noise_level) notes.push(`Noise is usually ${workspace.noise_level}.`);
  if (workspace.good_for_calls) notes.push("Calls are marked as acceptable here.");
  if (workspace.has_coffee || workspace.has_food) {
    notes.push(workspace.has_food ? "Food and drinks are available." : "Coffee is available.");
  }

  return {
    bestFor: bestFor.slice(0, 5),
    notes: notes.slice(0, 5),
  };
}
