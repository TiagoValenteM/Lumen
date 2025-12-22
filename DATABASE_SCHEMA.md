# Database Schema Documentation

## Overview

This database schema is designed for a workspace/cafe discovery and review platform similar to LaptopFriendly. It supports cafes, coworking spaces, hotel lobbies, and other productive work environments.

## Core Tables

### 1. **workspaces**
Main table for all work-friendly locations (cafes, coworking spaces, etc.)

**Key Features:**
- Comprehensive productivity metrics (WiFi, power outlets, seating)
- Ambiance details (noise level, lighting, climate)
- Amenities and policies
- Aggregated ratings from reviews
- Status workflow (pending → under_review → approved/rejected)

**Important Fields:**
- `type`: cafe, coworking, hotel_lobby, library, restaurant, other
- `status`: pending, approved, rejected, under_review
- `wifi_speed`: slow, moderate, fast, very_fast
- `noise_level`: quiet, moderate, loud
- `seating_comfort`: uncomfortable, adequate, comfortable, very_comfortable
- `price_range`: 1-4 (1=cheap, 4=expensive)
- `opening_hours`: JSONB storing weekly schedule
- `popular_times`: JSONB storing hourly traffic data

### 2. **cities**
Geographic locations where workspaces are located

**Features:**
- Country and timezone information
- Coordinates for mapping
- Workspace count (auto-updated)
- Featured cities for homepage

### 3. **reviews**
User reviews and ratings for workspaces

**Features:**
- Multiple rating categories (overall, productivity, comfort, service)
- Visit date tracking
- Recommendation flag
- One review per user per workspace (enforced by unique constraint)
- Auto-updates workspace ratings via trigger

### 4. **workspace_photos**
Photos uploaded by users for workspaces

**Features:**
- Primary photo designation
- Approval workflow
- User attribution
- Caption support

### 5. **saved_workspaces**
User's saved/bookmarked workspaces

**Features:**
- Personal notes
- Quick access to favorites
- One-to-many relationship (user can save many workspaces)

### 6. **profiles**
Extended user information (supplements auth.users)

**Features:**
- Name and bio
- Avatar
- Location preference
- Stats (reviews count, workspaces added)
- Roles (ambassador, admin)

## Relationships

```
auth.users (Supabase Auth)
    ↓
profiles (1:1)
    ↓
    ├─→ reviews (1:many)
    ├─→ saved_workspaces (1:many)
    ├─→ workspace_photos (1:many)
    └─→ workspaces (submitted_by, 1:many)

cities (1:many)
    ↓
workspaces
    ↓
    ├─→ reviews (1:many)
    ├─→ workspace_photos (1:many)
    └─→ saved_workspaces (1:many)
```

## Productivity Criteria

### WiFi & Power
- `has_wifi`: Boolean
- `wifi_speed`: Enum (slow/moderate/fast/very_fast)
- `wifi_password_required`: Boolean
- `has_power_outlets`: Boolean
- `power_outlet_availability`: 1-5 scale

### Seating
- `seating_capacity`: Integer
- `seating_comfort`: Enum
- `has_outdoor_seating`: Boolean
- `has_standing_desks`: Boolean

### Ambiance
- `noise_level`: Enum (quiet/moderate/loud)
- `has_natural_light`: Boolean
- `has_air_conditioning`: Boolean
- `has_heating`: Boolean
- `music_volume`: 1-5 scale

### Community
- `good_for_meetings`: Boolean
- `good_for_calls`: Boolean
- `popular_times`: JSONB with hourly data

## Service & Amenities

### Food & Beverage
- `has_food`: Boolean
- `has_coffee`: Boolean
- `has_alcohol`: Boolean
- `price_range`: 1-4 scale

### Facilities
- `has_restrooms`: Boolean
- `has_parking`: Boolean
- `has_bike_parking`: Boolean
- `is_accessible`: Boolean (wheelchair accessible)
- `allows_pets`: Boolean

### Policies
- `laptop_friendly`: Boolean
- `time_limit_hours`: Integer (null = no limit)
- `minimum_purchase_required`: Boolean

## Rating System

Ratings are calculated automatically from reviews:

1. **Individual Reviews** (1-5 stars each):
   - Overall rating (required)
   - Productivity rating (optional)
   - Comfort rating (optional)
   - Service rating (optional)

2. **Aggregated Workspace Ratings**:
   - Calculated as average of all reviews
   - Updated automatically via database trigger
   - Stored as DECIMAL(3,2) for precision

## Row Level Security (RLS)

### Workspaces
- **Read**: Everyone can view approved workspaces; users can view their own pending submissions
- **Create**: Authenticated users only
- **Update**: Users can update their own pending workspaces

### Reviews
- **Read**: Public
- **Create**: Authenticated users only (one per workspace)
- **Update/Delete**: Own reviews only

### Photos
- **Read**: Approved photos are public
- **Create**: Authenticated users only

### Saved Workspaces
- **All operations**: Own saved workspaces only

### Profiles
- **Read**: Public
- **Update**: Own profile only

## Indexes

Performance indexes created for:
- Workspace lookups by city, status, type, slug
- Geographic queries (using PostGIS)
- Rating-based sorting
- Review queries by workspace and user
- Photo lookups by workspace

## Triggers

1. **update_updated_at_column**: Auto-updates `updated_at` timestamp
2. **update_workspace_ratings_on_review**: Recalculates workspace ratings when reviews change

## Usage Examples

### Create a Workspace
```typescript
const { data, error } = await supabase
  .from('workspaces')
  .insert({
    name: 'Café Malea',
    slug: 'cafe-malea',
    type: 'cafe',
    city_id: cityId,
    has_wifi: true,
    wifi_speed: 'fast',
    has_power_outlets: true,
    laptop_friendly: true,
    submitted_by: userId
  });
```

### Get Workspaces by City
```typescript
const { data, error } = await supabase
  .from('workspaces')
  .select(`
    *,
    cities (name, country),
    workspace_photos (url, is_primary)
  `)
  .eq('city_id', cityId)
  .eq('status', 'approved')
  .order('overall_rating', { ascending: false });
```

### Add a Review
```typescript
const { data, error } = await supabase
  .from('reviews')
  .insert({
    workspace_id: workspaceId,
    user_id: userId,
    overall_rating: 5,
    productivity_rating: 5,
    comfort_rating: 4,
    comment: 'Great place to work!'
  });
// Workspace ratings update automatically via trigger
```

### Save a Workspace
```typescript
const { data, error } = await supabase
  .from('saved_workspaces')
  .insert({
    user_id: userId,
    workspace_id: workspaceId,
    notes: 'Good for morning work sessions'
  });
```

## Migration Instructions

1. **Run the migration in Supabase**:
   ```bash
   # Copy the SQL from supabase/migrations/001_create_workspaces_schema.sql
   # Paste into Supabase SQL Editor and run
   ```

2. **Seed initial data** (cities):
   ```sql
   INSERT INTO cities (name, slug, country, country_code) VALUES
   ('Lisbon', 'lisbon', 'Portugal', 'PT'),
   ('Porto', 'porto', 'Portugal', 'PT'),
   ('Barcelona', 'barcelona', 'Spain', 'ES');
   ```

3. **Create storage bucket for photos**:
   - Go to Storage in Supabase
   - Create bucket: `workspace-photos`
   - Set to public
   - Add RLS policies as needed

## Next Steps

1. Create workspace submission form
2. Build workspace detail page
3. Implement review system
4. Add photo upload functionality
5. Create search and filter UI
6. Build user dashboard for saved workspaces
