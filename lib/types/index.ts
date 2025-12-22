// Shared types across the application

export interface City {
  id: string;
  name: string;
  slug: string;
  country: string;
  workspace_count?: number;
  description?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: string;
  short_description: string | null;
  address: string | null;
  has_wifi: boolean;
  has_power_outlets: boolean;
  has_coffee: boolean;
  overall_rating: number | null;
  total_reviews: number;
  primary_photo?: {
    url: string;
  } | null;
}

export interface WorkspaceDetail extends Workspace {
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  wifi_speed: string | null;
  noise_level: string | null;
  best_time_to_visit: string | null;
  atmosphere_rating: number | null;
  productivity_rating: number | null;
  comfort_rating: number | null;
  service_rating: number | null;
  price_range: string | null;
  power_outlet_availability: number | null;
  seating_capacity: number | null;
  has_food: boolean;
  has_natural_light: boolean;
  has_air_conditioning: boolean;
  has_parking: boolean;
  has_bike_parking: boolean;
  is_accessible: boolean;
  allows_pets: boolean;
  website: string | null;
  phone: string | null;
  time_limit_hours: number | null;
  minimum_purchase_required: boolean;
  good_for_meetings: boolean;
  good_for_calls: boolean;
}

export interface Photo {
  id: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
}

export interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
  tag: string | null;
  bio?: string | null;
  created_at?: string;
}

export type ProfileSummary = Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'email' | 'tag'>;

export interface CountryGroup {
  name: string;
  cities: City[];
}
