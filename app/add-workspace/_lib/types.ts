export type AddWorkspaceLocationSource = "search" | "pin" | "manual";

export type AddWorkspaceFieldValue = string | number | boolean | null;

export type UpdateAddWorkspaceField = (field: keyof AddWorkspaceFormData, value: AddWorkspaceFieldValue) => void;

export type WorkspaceDuplicateCandidate = {
  id: string;
  name: string;
  slug: string;
  status: string;
  address: string | null;
  cityName: string | null;
  citySlug: string | null;
  distanceMeters: number | null;
  matchScore: number;
};

export interface AddWorkspaceFormData {
  name: string;
  type: string;
  city_id: string | null;
  city_name: string;
  country: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  location_source: AddWorkspaceLocationSource;
  location_provider: string | null;
  location_provider_id: string | null;
  location_confidence: number | null;
  location_raw: unknown;
  website: string;
  phone: string;
  description: string;
  short_description: string;
  has_wifi: boolean;
  wifi_speed: string;
  has_power_outlets: boolean;
  power_outlet_availability: number;
  seating_capacity: number;
  seating_comfort: string;
  has_outdoor_seating: boolean;
  has_standing_desks: boolean;
  noise_level: string;
  has_natural_light: boolean;
  has_air_conditioning: boolean;
  has_heating: boolean;
  music_volume: number;
  has_restrooms: boolean;
  has_parking: boolean;
  has_bike_parking: boolean;
  is_accessible: boolean;
  allows_pets: boolean;
  has_food: boolean;
  has_veg: boolean;
  has_coffee: boolean;
  has_alcohol: boolean;
  price_range: number;
  laptop_friendly: boolean;
  time_limit_hours: number;
  minimum_purchase_required: boolean;
  good_for_meetings: boolean;
  good_for_calls: boolean;
  good_for_groups: boolean;
}
