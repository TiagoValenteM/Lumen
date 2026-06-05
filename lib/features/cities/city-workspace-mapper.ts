import type { Workspace } from "@/lib/types";

type WorkspacePhotoRow = {
  url: string;
  is_primary: boolean | null;
  is_approved: boolean | null;
};

type CityWorkspaceRow = Omit<Workspace, "primary_photo"> & {
  workspace_photos?: WorkspacePhotoRow[] | null;
};

export function mapCityWorkspaceRow(row: CityWorkspaceRow): Workspace {
  const approvedPhotos = (row.workspace_photos || []).filter((photo) => photo.is_approved);
  const primaryPhoto = approvedPhotos.find((photo) => photo.is_primary) || approvedPhotos[0] || null;
  const workspace = omitWorkspacePhotos(row);

  return {
    ...workspace,
    has_wifi: Boolean(row.has_wifi),
    has_power_outlets: Boolean(row.has_power_outlets),
    has_coffee: Boolean(row.has_coffee),
    has_food: Boolean(row.has_food),
    has_veg: Boolean(row.has_veg),
    has_alcohol: Boolean(row.has_alcohol),
    has_outdoor_seating: Boolean(row.has_outdoor_seating),
    has_restrooms: Boolean(row.has_restrooms),
    has_bike_parking: Boolean(row.has_bike_parking),
    has_parking: Boolean(row.has_parking),
    has_natural_light: Boolean(row.has_natural_light),
    is_accessible: Boolean(row.is_accessible),
    allows_pets: Boolean(row.allows_pets),
    good_for_calls: Boolean(row.good_for_calls),
    good_for_meetings: Boolean(row.good_for_meetings),
    good_for_groups: Boolean(row.good_for_groups),
    music_volume: normalizeNumber(row.music_volume),
    time_limit_hours: normalizeNumber(row.time_limit_hours),
    primary_photo: primaryPhoto ? { url: primaryPhoto.url } : null,
  };
}

function normalizeNumber(value: number | null | undefined) {
  if (typeof value === "number") return value;
  if (value === null) return null;
  return undefined;
}

function omitWorkspacePhotos(row: CityWorkspaceRow): Omit<CityWorkspaceRow, "workspace_photos"> {
  const workspace = { ...row };
  delete workspace.workspace_photos;
  return workspace;
}
