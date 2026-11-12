export type WorkspaceStatus = "pending" | "under_review" | "approved" | "rejected";

export type LocationSource = "search" | "pin" | "manual";

export type WorkspaceDetailMinimal = {
  id: string;
  created_at?: string | null;
  name: string;
  slug: string;
  type?: string | null;
  status: string | null;
  description?: string | null;
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
  has_wifi?: boolean | null;
  wifi_speed?: string | null;
  has_power_outlets?: boolean | null;
  power_outlet_availability?: number | null;
  seating_capacity?: number | null;
  seating_comfort?: string | null;
  has_outdoor_seating?: boolean | null;
  has_standing_desks?: boolean | null;
  noise_level?: string | null;
  music_volume?: number | null;
  has_natural_light?: boolean | null;
  has_air_conditioning?: boolean | null;
  has_heating?: boolean | null;
  has_restrooms?: boolean | null;
  has_parking?: boolean | null;
  has_bike_parking?: boolean | null;
  is_accessible?: boolean | null;
  allows_pets?: boolean | null;
  has_food?: boolean | null;
  has_veg?: boolean | null;
  has_coffee?: boolean | null;
  has_alcohol?: boolean | null;
  price_range?: string | number | null;
  laptop_friendly?: boolean | null;
  time_limit_hours?: number | null;
  minimum_purchase_required?: boolean | null;
  good_for_meetings?: boolean | null;
  good_for_calls?: boolean | null;
  good_for_groups?: boolean | null;
  overall_rating?: number | null;
  productivity_rating?: number | null;
  comfort_rating?: number | null;
  service_rating?: number | null;
  atmosphere_rating?: number | null;
  total_reviews?: number | null;
  last_verified_at?: string | null;
  reported_change_count?: number | null;
  best_time_to_visit?: string | null;
  website?: string | null;
  phone?: string | null;
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
  created_at?: string | null;
  name: string;
  slug: string;
  type?: string | null;
  status: string | null;
  description?: string | null;
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
  has_wifi?: boolean | null;
  wifi_speed?: string | null;
  has_power_outlets?: boolean | null;
  power_outlet_availability?: number | null;
  seating_capacity?: number | null;
  seating_comfort?: string | null;
  has_outdoor_seating?: boolean | null;
  has_standing_desks?: boolean | null;
  noise_level?: string | null;
  music_volume?: number | null;
  has_natural_light?: boolean | null;
  has_air_conditioning?: boolean | null;
  has_heating?: boolean | null;
  has_restrooms?: boolean | null;
  has_parking?: boolean | null;
  has_bike_parking?: boolean | null;
  is_accessible?: boolean | null;
  allows_pets?: boolean | null;
  has_food?: boolean | null;
  has_veg?: boolean | null;
  has_coffee?: boolean | null;
  has_alcohol?: boolean | null;
  price_range?: string | number | null;
  laptop_friendly?: boolean | null;
  time_limit_hours?: number | null;
  minimum_purchase_required?: boolean | null;
  good_for_meetings?: boolean | null;
  good_for_calls?: boolean | null;
  good_for_groups?: boolean | null;
  overall_rating?: number | null;
  productivity_rating?: number | null;
  comfort_rating?: number | null;
  service_rating?: number | null;
  atmosphere_rating?: number | null;
  total_reviews?: number | null;
  last_verified_at?: string | null;
  reported_change_count?: number | null;
  best_time_to_visit?: string | null;
  website?: string | null;
  phone?: string | null;
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

export type AiEnrichmentStatus =
  | "queued"
  | "researching"
  | "extracting"
  | "ready_for_review"
  | "pending"
  | "completed"
  | "failed"
  | "dismissed"
  | "applied";

export type AiRunMode = "full" | "no_web" | "text_only" | "details_only";
export type AiFieldDecision = "applied" | "rejected" | "ignored";

export type AiFieldEvidence = {
  confidence: "low" | "medium" | "high";
  basis: "confirmed" | "review_signal" | "likely" | "unknown" | "conflicting";
  source_quality: "official" | "directory" | "review_pattern" | "submitted_data" | "model_knowledge" | "unknown";
  evidence: string | null;
  source: string | null;
};

export type AiEnrichmentRow = {
  updated_at?: string | null;
  id: string;
  created_at: string;
  status: AiEnrichmentStatus | string;
  provider: string;
  model: string;
  run_mode?: AiRunMode | string | null;
  suggested_fields: {
    core_details?: {
      name?: string | null;
      type?: "cafe" | "coworking" | "hotel_lobby" | "library" | "restaurant" | "other" | null;
      address?: string | null;
      city?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
    short_description?: string | null;
    description?: string | null;
    website?: string | null;
    phone?: string | null;
    opening_hours_note?: string | null;
    work_notes?: string[] | null;
    review_insights?: {
      summary: string | null;
      positives: string[] | null;
      cautions: string[] | null;
      remote_work_signal: string | null;
    } | null;
    work_details?: Record<string, string | number | boolean | null> | null;
    _field_evidence?: Record<string, AiFieldEvidence> | null;
    _unknown_fields?: string[] | null;
    _field_decisions?: Record<string, AiFieldDecision> | null;
  } | null;
  field_evidence?: Record<string, AiFieldEvidence> | null;
  unknown_fields?: string[] | null;
  field_decisions?: Record<string, AiFieldDecision> | null;
  run_metadata?: Record<string, unknown> | null;
  field_sources: Record<string, string[]> | null;
  citations: { url?: string; title?: string | null; content?: string | null }[] | null;
  error_message: string | null;
};

export type AdminWorkspaceFormState = {
  name: string;
  type: string;
  short_description: string;
  description: string;
  address: string;
  website: string;
  phone: string;
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
  has_wifi: boolean;
  wifi_speed: string;
  has_power_outlets: boolean;
  power_outlet_availability: number;
  seating_capacity: number;
  seating_comfort: string;
  has_outdoor_seating: boolean;
  has_standing_desks: boolean;
  noise_level: string;
  music_volume: number;
  has_natural_light: boolean;
  has_air_conditioning: boolean;
  has_heating: boolean;
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
};
