export type WorkspaceType = 'cafe' | 'coworking' | 'hotel_lobby' | 'library' | 'restaurant' | 'other';
export type WorkspaceStatus = 'pending' | 'approved' | 'rejected' | 'under_review';
export type NoiseLevel = 'quiet' | 'moderate' | 'loud';
export type SeatingComfort = 'uncomfortable' | 'adequate' | 'comfortable' | 'very_comfortable';
export type WifiSpeed = 'slow' | 'moderate' | 'fast' | 'very_fast';

export interface OpeningHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

export interface PopularTimes {
  monday?: number[];
  tuesday?: number[];
  wednesday?: number[];
  thursday?: number[];
  friday?: number[];
  saturday?: number[];
  sunday?: number[];
}

export interface Workspace {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Basic Information
  name: string;
  slug: string;
  type: WorkspaceType;
  status: WorkspaceStatus;
  
  // Location
  city_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  
  // Contact & Links
  website: string | null;
  phone: string | null;
  email: string | null;
  google_maps_url: string | null;
  
  // Description
  description: string | null;
  short_description: string | null;
  
  // Hours
  opening_hours: OpeningHours | null;
  
  // Productivity Features
  has_wifi: boolean;
  wifi_speed: WifiSpeed | null;
  wifi_password_required: boolean;
  has_power_outlets: boolean;
  power_outlet_availability: number | null;
  
  // Seating
  seating_capacity: number | null;
  seating_comfort: SeatingComfort | null;
  has_outdoor_seating: boolean;
  has_standing_desks: boolean;
  
  // Ambiance
  noise_level: NoiseLevel | null;
  has_natural_light: boolean;
  has_air_conditioning: boolean;
  has_heating: boolean;
  music_volume: number | null;
  
  // Amenities
  has_restrooms: boolean;
  has_parking: boolean;
  has_bike_parking: boolean;
  is_accessible: boolean;
  allows_pets: boolean;
  
  // Food & Beverage
  has_food: boolean;
  has_coffee: boolean;
  has_alcohol: boolean;
  price_range: number | null;
  
  // Policies
  laptop_friendly: boolean;
  time_limit_hours: number | null;
  minimum_purchase_required: boolean;
  
  // Community
  good_for_meetings: boolean;
  good_for_calls: boolean;
  popular_times: PopularTimes | null;
  
  // Ratings
  overall_rating: number | null;
  productivity_rating: number | null;
  comfort_rating: number | null;
  service_rating: number | null;
  total_reviews: number;
  
  // Metadata
  submitted_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  featured: boolean;
  view_count: number;
}

export interface City {
  id: string;
  created_at: string;
  
  name: string;
  slug: string;
  country: string;
  country_code: string | null;
  
  // Location
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  
  // Description
  description: string | null;
  image_url: string | null;
  
  // Stats
  workspace_count: number;
  
  // Metadata
  featured: boolean;
}

export interface Review {
  id: string;
  created_at: string;
  updated_at: string;
  
  workspace_id: string;
  user_id: string;
  
  // Ratings
  overall_rating: number;
  productivity_rating: number | null;
  comfort_rating: number | null;
  service_rating: number | null;
  
  // Review content
  title: string | null;
  comment: string | null;
  
  // Visit details
  visited_at: string | null;
  would_recommend: boolean | null;
  
  // Moderation
  is_verified: boolean;
  is_flagged: boolean;
}

export interface WorkspacePhoto {
  id: string;
  created_at: string;
  
  workspace_id: string;
  user_id: string | null;
  
  url: string;
  caption: string | null;
  is_primary: boolean;
  
  // Moderation
  is_approved: boolean;
  approved_by: string | null;
}

export interface SavedWorkspace {
  id: string;
  created_at: string;
  
  user_id: string;
  workspace_id: string;
  
  notes: string | null;
}

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  
  // Location
  city_id: string | null;
  
  // Stats
  reviews_count: number;
  workspaces_added: number;
  
  // Roles
  is_ambassador: boolean;
  is_admin: boolean;
}

// Database helper types
export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, 'id' | 'created_at' | 'updated_at' | 'overall_rating' | 'productivity_rating' | 'comfort_rating' | 'service_rating' | 'total_reviews' | 'view_count'>;
        Update: Partial<Omit<Workspace, 'id' | 'created_at'>>;
      };
      cities: {
        Row: City;
        Insert: Omit<City, 'id' | 'created_at' | 'workspace_count'>;
        Update: Partial<Omit<City, 'id' | 'created_at'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at' | 'updated_at' | 'is_verified' | 'is_flagged'>;
        Update: Partial<Omit<Review, 'id' | 'created_at' | 'workspace_id' | 'user_id'>>;
      };
      workspace_photos: {
        Row: WorkspacePhoto;
        Insert: Omit<WorkspacePhoto, 'id' | 'created_at' | 'is_approved' | 'approved_by'>;
        Update: Partial<Omit<WorkspacePhoto, 'id' | 'created_at' | 'workspace_id'>>;
      };
      saved_workspaces: {
        Row: SavedWorkspace;
        Insert: Omit<SavedWorkspace, 'id' | 'created_at'>;
        Update: Partial<Omit<SavedWorkspace, 'id' | 'created_at' | 'user_id' | 'workspace_id'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at' | 'reviews_count' | 'workspaces_added' | 'is_ambassador' | 'is_admin'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
    };
  };
}
