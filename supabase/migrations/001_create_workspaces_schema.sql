-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE workspace_type AS ENUM ('cafe', 'coworking', 'hotel_lobby', 'library', 'restaurant', 'other');
CREATE TYPE workspace_status AS ENUM ('pending', 'approved', 'rejected', 'under_review');
CREATE TYPE noise_level AS ENUM ('quiet', 'moderate', 'loud');
CREATE TYPE seating_comfort AS ENUM ('uncomfortable', 'adequate', 'comfortable', 'very_comfortable');
CREATE TYPE wifi_speed AS ENUM ('slow', 'moderate', 'fast', 'very_fast');

-- Cities table (must be created first because workspaces references it)
CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    country VARCHAR(100) NOT NULL,
    country_code VARCHAR(2),
    
    -- Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(100),
    
    -- Description
    description TEXT,
    image_url TEXT,
    
    -- Stats
    workspace_count INTEGER DEFAULT 0,
    
    -- Metadata
    featured BOOLEAN DEFAULT false
);

-- Workspaces table (main table for cafes, coworking spaces, etc.)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type workspace_type NOT NULL DEFAULT 'cafe',
    status workspace_status NOT NULL DEFAULT 'pending',
    
    -- Location
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Contact & Links
    website VARCHAR(500),
    phone VARCHAR(50),
    email VARCHAR(255),
    google_maps_url TEXT,
    
    -- Description
    description TEXT,
    short_description VARCHAR(500),
    
    -- Hours (stored as JSONB for flexibility)
    opening_hours JSONB,
    
    -- Productivity Features
    has_wifi BOOLEAN DEFAULT false,
    wifi_speed wifi_speed,
    wifi_password_required BOOLEAN DEFAULT true,
    has_power_outlets BOOLEAN DEFAULT false,
    power_outlet_availability INTEGER CHECK (power_outlet_availability BETWEEN 1 AND 5),
    
    -- Seating
    seating_capacity INTEGER,
    seating_comfort seating_comfort,
    has_outdoor_seating BOOLEAN DEFAULT false,
    has_standing_desks BOOLEAN DEFAULT false,
    
    -- Ambiance
    noise_level noise_level,
    has_natural_light BOOLEAN DEFAULT false,
    has_air_conditioning BOOLEAN DEFAULT false,
    has_heating BOOLEAN DEFAULT false,
    music_volume INTEGER CHECK (music_volume BETWEEN 1 AND 5),
    
    -- Amenities
    has_restrooms BOOLEAN DEFAULT false,
    has_parking BOOLEAN DEFAULT false,
    has_bike_parking BOOLEAN DEFAULT false,
    is_accessible BOOLEAN DEFAULT false,
    allows_pets BOOLEAN DEFAULT false,
    
    -- Food & Beverage
    has_food BOOLEAN DEFAULT false,
    has_coffee BOOLEAN DEFAULT false,
    has_alcohol BOOLEAN DEFAULT false,
    price_range INTEGER CHECK (price_range BETWEEN 1 AND 4), -- 1=cheap, 4=expensive
    
    -- Policies
    laptop_friendly BOOLEAN DEFAULT true,
    time_limit_hours INTEGER,
    minimum_purchase_required BOOLEAN DEFAULT false,
    
    -- Community
    good_for_meetings BOOLEAN DEFAULT false,
    good_for_calls BOOLEAN DEFAULT false,
    popular_times JSONB, -- Store peak hours data
    
    -- Ratings (aggregated from reviews)
    overall_rating DECIMAL(3, 2) CHECK (overall_rating BETWEEN 0 AND 5),
    productivity_rating DECIMAL(3, 2) CHECK (productivity_rating BETWEEN 0 AND 5),
    comfort_rating DECIMAL(3, 2) CHECK (comfort_rating BETWEEN 0 AND 5),
    service_rating DECIMAL(3, 2) CHECK (service_rating BETWEEN 0 AND 5),
    total_reviews INTEGER DEFAULT 0,
    
    -- Metadata
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0
);

-- Reviews table - REMOVED
-- The reviews table is now created in migration 004_create_reviews_table.sql
-- with a simpler schema (rating, comment, timestamps)
-- If you already ran this migration, you need to:
-- 1. DROP TABLE IF EXISTS reviews CASCADE;
-- 2. Run migration 004_create_reviews_table.sql

-- Old schema kept here for reference:
-- CREATE TABLE reviews (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     
--     workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
--     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
--     
--     -- Ratings
--     overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
--     productivity_rating INTEGER CHECK (productivity_rating BETWEEN 1 AND 5),
--     comfort_rating INTEGER CHECK (comfort_rating BETWEEN 1 AND 5),
--     service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
--     
--     -- Review content
--     title VARCHAR(255),
--     comment TEXT,
--     
--     -- Visit details
--     visited_at DATE,
--     would_recommend BOOLEAN,
--     
--     -- Moderation
--     is_verified BOOLEAN DEFAULT false,
--     is_flagged BOOLEAN DEFAULT false,
--     
--     -- Prevent duplicate reviews
--     UNIQUE(workspace_id, user_id)
-- );

-- Photos table
CREATE TABLE workspace_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    url TEXT NOT NULL,
    caption TEXT,
    is_primary BOOLEAN DEFAULT false,
    
    -- Moderation
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Saved workspaces (user favorites)
CREATE TABLE saved_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    notes TEXT,
    
    UNIQUE(user_id, workspace_id)
);

-- User profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    
    -- Location
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    
    -- Stats
    reviews_count INTEGER DEFAULT 0,
    workspaces_added INTEGER DEFAULT 0,
    
    -- Roles
    is_ambassador BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX idx_workspaces_city ON workspaces(city_id);
CREATE INDEX idx_workspaces_status ON workspaces(status);
CREATE INDEX idx_workspaces_type ON workspaces(type);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_rating ON workspaces(overall_rating DESC);
-- Geographic index for location-based queries (latitude, longitude)
CREATE INDEX idx_workspaces_location ON workspaces(latitude, longitude);

CREATE INDEX idx_reviews_workspace ON reviews(workspace_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

CREATE INDEX idx_cities_slug ON cities(slug);
CREATE INDEX idx_cities_country ON cities(country);

CREATE INDEX idx_saved_workspaces_user ON saved_workspaces(user_id);
CREATE INDEX idx_saved_workspaces_workspace ON saved_workspaces(workspace_id);

CREATE INDEX idx_photos_workspace ON workspace_photos(workspace_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update workspace ratings when reviews change
CREATE OR REPLACE FUNCTION update_workspace_ratings()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE workspaces
    SET 
        overall_rating = (
            SELECT AVG(overall_rating)::DECIMAL(3,2)
            FROM reviews
            WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
        ),
        productivity_rating = (
            SELECT AVG(productivity_rating)::DECIMAL(3,2)
            FROM reviews
            WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
            AND productivity_rating IS NOT NULL
        ),
        comfort_rating = (
            SELECT AVG(comfort_rating)::DECIMAL(3,2)
            FROM reviews
            WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
            AND comfort_rating IS NOT NULL
        ),
        service_rating = (
            SELECT AVG(service_rating)::DECIMAL(3,2)
            FROM reviews
            WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
            AND service_rating IS NOT NULL
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
        )
    WHERE id = COALESCE(NEW.workspace_id, OLD.workspace_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ratings
CREATE TRIGGER update_workspace_ratings_on_review
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_workspace_ratings();

-- Enable Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Workspaces are viewable by everyone" ON workspaces
    FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid());

CREATE POLICY "Authenticated users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own pending workspaces" ON workspaces
    FOR UPDATE USING (submitted_by = auth.uid() AND status = 'pending');

-- RLS Policies for cities
CREATE POLICY "Cities are viewable by everyone" ON cities
    FOR SELECT USING (true);

-- RLS Policies for reviews
CREATE POLICY "Reviews are viewable by everyone" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for photos
CREATE POLICY "Approved photos are viewable by everyone" ON workspace_photos
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Authenticated users can upload photos" ON workspace_photos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- RLS Policies for saved workspaces
CREATE POLICY "Users can view their own saved workspaces" ON saved_workspaces
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can save workspaces" ON saved_workspaces
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their saved workspaces" ON saved_workspaces
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());
