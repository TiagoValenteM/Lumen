import type { SupabaseClient } from "@supabase/supabase-js";
import type { AddWorkspaceFormData, WorkspaceDuplicateCandidate } from "./types";

type WorkspaceDuplicateSearchInput = Pick<AddWorkspaceFormData, "latitude" | "longitude" | "name">;

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  city_id: string | null;
};

type CityRow = {
  id: string;
  name: string;
  slug: string;
};

const SEARCH_RADIUS_METERS = 1500;
const EARTH_RADIUS_METERS = 6371000;

export async function findPotentialWorkspaceDuplicates(
  supabase: SupabaseClient,
  formData: WorkspaceDuplicateSearchInput,
): Promise<WorkspaceDuplicateCandidate[]> {
  if (!formData.name.trim() || formData.latitude === null || formData.longitude === null) return [];

  const bounds = getCoordinateBounds(formData.latitude, formData.longitude, SEARCH_RADIUS_METERS);
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, status, address, latitude, longitude, city_id")
    .in("status", ["approved", "pending", "under_review"])
    .gte("latitude", bounds.minLatitude)
    .lte("latitude", bounds.maxLatitude)
    .gte("longitude", bounds.minLongitude)
    .lte("longitude", bounds.maxLongitude)
    .limit(20);

  if (error) throw error;
  if (!workspaces?.length) return [];

  const cityIds = Array.from(new Set(workspaces.map((workspace) => workspace.city_id).filter(Boolean))) as string[];
  const citiesById = await loadCitiesById(supabase, cityIds);

  return (workspaces as WorkspaceRow[])
    .map((workspace) => toDuplicateCandidate(workspace, citiesById, formData))
    .filter((candidate) => candidate.matchScore >= 0.35 || Number(candidate.distanceMeters) <= 125)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 4);
}

async function loadCitiesById(supabase: SupabaseClient, cityIds: string[]) {
  if (cityIds.length === 0) return new Map<string, CityRow>();

  const { data, error } = await supabase.from("cities").select("id, name, slug").in("id", cityIds);
  if (error) throw error;

  return new Map((data as CityRow[] | null)?.map((city) => [city.id, city]) ?? []);
}

function toDuplicateCandidate(
  workspace: WorkspaceRow,
  citiesById: Map<string, CityRow>,
  formData: WorkspaceDuplicateSearchInput,
): WorkspaceDuplicateCandidate {
  const distanceMeters =
    workspace.latitude !== null && workspace.longitude !== null
      ? getDistanceMeters(formData.latitude ?? 0, formData.longitude ?? 0, workspace.latitude, workspace.longitude)
      : null;
  const city = workspace.city_id ? citiesById.get(workspace.city_id) : undefined;
  const nameScore = getNameSimilarity(formData.name, workspace.name);
  const proximityScore = distanceMeters === null ? 0 : Math.max(0, 1 - distanceMeters / SEARCH_RADIUS_METERS);

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
    address: workspace.address,
    cityName: city?.name ?? null,
    citySlug: city?.slug ?? null,
    distanceMeters,
    matchScore: Math.max(nameScore, nameScore * 0.7 + proximityScore * 0.3),
  };
}

function getCoordinateBounds(latitude: number, longitude: number, radiusMeters: number) {
  const latitudeDelta = radiusMeters / 111320;
  const longitudeDelta = radiusMeters / (111320 * Math.cos((latitude * Math.PI) / 180));

  return {
    minLatitude: latitude - latitudeDelta,
    maxLatitude: latitude + latitudeDelta,
    minLongitude: longitude - longitudeDelta,
    maxLongitude: longitude + longitudeDelta,
  };
}

function getDistanceMeters(startLatitude: number, startLongitude: number, endLatitude: number, endLongitude: number) {
  const lat1 = toRadians(startLatitude);
  const lat2 = toRadians(endLatitude);
  const deltaLat = toRadians(endLatitude - startLatitude);
  const deltaLng = toRadians(endLongitude - startLongitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return Math.round(EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getNameSimilarity(inputName: string, candidateName: string) {
  const input = normalizeName(inputName);
  const candidate = normalizeName(candidateName);

  if (!input || !candidate) return 0;
  if (input === candidate) return 1;
  if (input.includes(candidate) || candidate.includes(input)) return 0.8;

  const inputTokens = new Set(input.split(" "));
  const candidateTokens = new Set(candidate.split(" "));
  const overlap = Array.from(inputTokens).filter((token) => candidateTokens.has(token)).length;
  const union = new Set([...inputTokens, ...candidateTokens]).size;

  return union === 0 ? 0 : overlap / union;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
