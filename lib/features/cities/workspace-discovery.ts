import type { Workspace } from "@/lib/types";

export type CityWorkspaceSortMode =
  | "best"
  | "reviewed"
  | "newest"
  | "quiet"
  | "long-stays"
  | "power"
  | "closest";

export type CityWorkspaceCollection =
  | {
      label: string;
      count: number;
      action: "filter";
      value: string;
    }
  | {
      label: string;
      count: number;
      action: "sort";
      value: CityWorkspaceSortMode;
    };

type FilterAndSortWorkspacesInput = {
  activeFilters: string[];
  distanceKm: (workspace: Workspace) => number;
  savedWorkspaceIds: Set<string>;
  sortMode: CityWorkspaceSortMode;
  supportedFilters: Record<string, keyof Workspace>;
  workspaces: Workspace[];
};

type DistanceInput = {
  userLatitude: number | null;
  userLongitude: number | null;
  workspace: Workspace;
};

export function filterAndSortCityWorkspaces({
  activeFilters,
  distanceKm,
  savedWorkspaceIds,
  sortMode,
  supportedFilters,
  workspaces,
}: FilterAndSortWorkspacesInput) {
  const base = !activeFilters.length
    ? workspaces
    : workspaces.filter((workspace) => {
        const hasSavedFilter = activeFilters.includes("Saved");
        const hasQuiet = activeFilters.includes("Quiet");
        const hasLongStays = activeFilters.includes("Long stays");
        const otherFilters = activeFilters.filter(
          (filter) => filter !== "Saved" && filter !== "Quiet" && filter !== "Long stays"
        );

        if (hasSavedFilter && !savedWorkspaceIds.has(workspace.id)) return false;

        if (hasQuiet && !isQuietWorkspace(workspace)) return false;

        if (hasLongStays && !isLongStayWorkspace(workspace)) return false;

        return otherFilters.every((filter) => {
          const key = supportedFilters[filter];
          if (!key) return true;
          return workspace[key] === true;
        });
      });

  return [...base].sort((a, b) => compareWorkspaces(a, b, sortMode, distanceKm));
}

export function getCityWorkspaceCollections(workspaces: Workspace[]): CityWorkspaceCollection[] {
  const quiet = workspaces.filter(isQuietWorkspace);
  const laptopReady = workspaces.filter((workspace) => workspace.has_wifi && workspace.has_power_outlets);
  const longStay = workspaces.filter(isLongStayWorkspace);
  const recentlyAdded = [...workspaces].sort((a, b) => getCreatedAt(b) - getCreatedAt(a));

  const collections: CityWorkspaceCollection[] = [
    { label: "Quiet picks", count: quiet.length, action: "filter", value: "Quiet" },
    { label: "Laptop-ready", count: laptopReady.length, action: "sort", value: "power" },
    { label: "Long-stay friendly", count: longStay.length, action: "filter", value: "Long stays" },
    { label: "Recently added", count: recentlyAdded.length, action: "sort", value: "newest" },
  ];

  return collections.filter((item) => item.count > 0);
}

export function getWorkspaceDistanceKm({ userLatitude, userLongitude, workspace }: DistanceInput) {
  if (
    userLatitude === null ||
    userLongitude === null ||
    workspace.latitude === null ||
    workspace.latitude === undefined ||
    workspace.longitude === null ||
    workspace.longitude === undefined
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const radius = 6371;
  const dLat = deg2rad(workspace.latitude - userLatitude);
  const dLon = deg2rad(workspace.longitude - userLongitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(userLatitude)) *
      Math.cos(deg2rad(workspace.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return radius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function hasWorkspaceCoordinates(workspace: Workspace) {
  return typeof workspace.latitude === "number" && typeof workspace.longitude === "number";
}

function compareWorkspaces(
  a: Workspace,
  b: Workspace,
  sortMode: CityWorkspaceSortMode,
  distanceKm: (workspace: Workspace) => number
) {
  if (sortMode === "reviewed") return (b.total_reviews || 0) - (a.total_reviews || 0);
  if (sortMode === "newest") return getCreatedAt(b) - getCreatedAt(a);
  if (sortMode === "quiet") return getQuietScore(b) - getQuietScore(a);
  if (sortMode === "long-stays") return Number(isLongStayWorkspace(b)) - Number(isLongStayWorkspace(a));
  if (sortMode === "power") return Number(b.has_power_outlets) - Number(a.has_power_outlets);
  if (sortMode === "closest") return distanceKm(a) - distanceKm(b);

  return (b.overall_rating || 0) - (a.overall_rating || 0);
}

function getCreatedAt(workspace: Workspace) {
  return new Date(workspace.created_at || 0).getTime();
}

function getQuietScore(workspace: Workspace) {
  return (workspace.noise_level === "quiet" ? 2 : 0) +
    (typeof workspace.music_volume === "number" ? 5 - workspace.music_volume : 1);
}

function isQuietWorkspace(workspace: Workspace) {
  return workspace.noise_level === "quiet" ||
    (typeof workspace.music_volume === "number" && workspace.music_volume <= 2);
}

function isLongStayWorkspace(workspace: Workspace) {
  return workspace.time_limit_hours === null || workspace.time_limit_hours === 0;
}
