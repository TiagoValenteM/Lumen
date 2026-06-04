export type WorkspaceStatus = "pending" | "under_review" | "approved" | "rejected";

export type LocationSource = "search" | "pin" | "manual";

export type WorkspaceDetailMinimal = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  short_description: string | null;
  address: string | null;
  city_id: string | null;
  city_slug: string | null;
  city_name: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: LocationSource | null;
  location_provider: string | null;
  location_provider_id: string | null;
  location_confidence: number | null;
  location_raw: unknown;
  rejection_reason: string | null;
  admin_notes: string | null;
  submitted_by: string | null;
};

export type WorkspacePhotoRow = {
  id: string;
  url: string;
  caption: string | null;
  is_primary: boolean | null;
  is_approved: boolean | null;
};

export type WorkspaceQueryRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  short_description: string | null;
  address: string | null;
  city_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: LocationSource | null;
  location_provider: string | null;
  location_provider_id: string | null;
  location_confidence: number | null;
  location_raw: unknown;
  rejection_reason: string | null;
  admin_notes: string | null;
  submitted_by: string | null;
  city:
    | { slug: string | null; name: string | null; country: string | null }
    | { slug: string | null; name: string | null; country: string | null }[]
    | null;
};

export type EditSuggestionRow = {
  id: string;
  created_at: string;
  kind: string;
  message: string;
  status: string;
  admin_notes: string | null;
};

export type AdminWorkspaceFormState = {
  name: string;
  short_description: string;
  address: string;
  city_id: string | null;
  city_name: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  location_source: LocationSource;
  location_provider: string | null;
  location_provider_id: string | null;
  location_confidence: number | null;
  location_raw: unknown;
  rejection_reason: string;
  admin_notes: string;
  status: string;
};
