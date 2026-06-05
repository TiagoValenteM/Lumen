import type { WorkspaceDetail } from "@/lib/types";

export type WorkabilityReport = {
  productivityScore: number;
  comfortScore: number;
  bestFor: string[];
  notes: string[];
};

export function getWorkabilityReport(workspace: WorkspaceDetail): WorkabilityReport {
  const productivitySignals = [
    workspace.has_wifi,
    workspace.has_power_outlets,
    workspace.power_outlet_availability !== null && workspace.power_outlet_availability >= 3,
    workspace.good_for_calls,
    workspace.good_for_meetings,
    workspace.time_limit_hours === null || workspace.time_limit_hours === 0 || workspace.time_limit_hours >= 3,
  ].map(Boolean);
  const comfortSignals = [
    workspace.has_natural_light,
    workspace.has_air_conditioning || workspace.has_heating,
    workspace.seating_capacity !== null && workspace.seating_capacity >= 20,
    workspace.noise_level === "quiet" || workspace.noise_level === "moderate",
    workspace.has_restrooms,
    workspace.has_food || workspace.has_coffee,
  ].map(Boolean);

  const bestFor: string[] = [];
  if (workspace.noise_level === "quiet") bestFor.push("Deep work");
  if (workspace.good_for_calls) bestFor.push("Calls");
  if (workspace.good_for_meetings) bestFor.push("Meetings");
  if (workspace.good_for_groups) bestFor.push("Groups");
  if (workspace.time_limit_hours === null || workspace.time_limit_hours === 0) bestFor.push("Long stays");
  if (!bestFor.length && workspace.has_wifi && workspace.has_power_outlets) bestFor.push("Laptop sessions");

  const notes: string[] = [];
  if (workspace.time_limit_hours === null || workspace.time_limit_hours === 0) {
    notes.push("No stay limit is listed.");
  } else if (workspace.time_limit_hours) {
    notes.push(`Plan around a ${workspace.time_limit_hours} hour stay limit.`);
  }
  if (workspace.minimum_purchase_required) notes.push("A purchase may be expected while working.");
  if (workspace.has_power_outlets) {
    notes.push("Power access is available.");
  } else {
    notes.push("Power outlets are not confirmed.");
  }
  if (workspace.noise_level) notes.push(`Noise is usually ${workspace.noise_level}.`);
  if (workspace.good_for_calls) notes.push("Calls are marked as acceptable here.");
  if (workspace.has_coffee || workspace.has_food) {
    notes.push(workspace.has_food ? "Food and drinks are available." : "Coffee is available.");
  }

  return {
    productivityScore: scoreSignals(productivitySignals),
    comfortScore: scoreSignals(comfortSignals),
    bestFor: bestFor.slice(0, 5),
    notes: notes.slice(0, 5),
  };
}

function scoreSignals(signals: boolean[]) {
  const score = Math.round((signals.filter(Boolean).length / signals.length) * 100);
  return Math.max(35, score);
}
