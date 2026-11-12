export type WorkFacts = {
  has_wifi: boolean | null;
  has_power_outlets: boolean | null;
  laptop_friendly: boolean | null;
  time_limit_hours: number | null;
};

type WorkFactInput = Partial<WorkFacts> & { work_facts_checked_at?: string | null };

export function getWorkFacts(workspace: WorkFactInput): WorkFacts {
  return {
    has_wifi: workspace.has_wifi ?? null,
    has_power_outlets: workspace.has_power_outlets ?? null,
    laptop_friendly: workspace.laptop_friendly ?? null,
    time_limit_hours: workspace.time_limit_hours ?? null,
  };
}

export function isLongStayWorkspace(workspace: WorkFactInput) {
  const limit = workspace.time_limit_hours;
  return workspace.laptop_friendly === true &&
    ((typeof limit === "number" && limit >= 3) || (limit === 0 && Boolean(workspace.work_facts_checked_at)));
}

export function isLaptopReadyWorkspace(workspace: WorkFactInput) {
  return workspace.laptop_friendly === true;
}

export function getStayLimitLabel(hours: number | null | undefined, checked = false) {
  if (hours === null || hours === undefined) return "Unknown";
  if (hours === 0) return checked ? "No stated limit" : "No limit reported";
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function getAvailabilityLabel(value: boolean | null | undefined, yes = "Available", no = "Not available") {
  return value === true ? yes : value === false ? no : "Unknown";
}
