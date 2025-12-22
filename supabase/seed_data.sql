-- Seed data for testing the workspace platform
-- Run this AFTER running the main migration

-- Insert Cities
INSERT INTO cities (id, name, slug, country, country_code, latitude, longitude, description) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Lisbon', 'lisbon', 'Portugal', 'PT', 38.7223, -9.1393, 'The vibrant capital of Portugal, known for its hills, historic trams, and thriving digital nomad community.'),
('550e8400-e29b-41d4-a716-446655440002', 'Porto', 'porto', 'Portugal', 'PT', 41.1579, -8.6291, 'Portugal''s second city, famous for port wine and beautiful riverside cafes.'),
('550e8400-e29b-41d4-a716-446655440003', 'Barcelona', 'barcelona', 'Spain', 'ES', 41.3851, 2.1734, 'Cosmopolitan city with stunning architecture and a vibrant coworking scene.'),
('550e8400-e29b-41d4-a716-446655440004', 'Madrid', 'madrid', 'Spain', 'ES', 40.4168, -3.7038, 'Spain''s capital with countless cafes perfect for remote work.'),
('550e8400-e29b-41d4-a716-446655440005', 'Paris', 'paris', 'France', 'FR', 48.8566, 2.3522, 'The City of Light with charming cafes on every corner.'),
('550e8400-e29b-41d4-a716-446655440006', 'Berlin', 'berlin', 'Germany', 'DE', 52.5200, 13.4050, 'Creative hub with excellent coworking spaces and cafe culture.'),
('550e8400-e29b-41d4-a716-446655440007', 'Amsterdam', 'amsterdam', 'Netherlands', 'NL', 52.3676, 4.9041, 'Bike-friendly city with cozy cafes and fast internet.');

-- Sample Workspaces (using placeholder image URLs - replace with actual photos later)
INSERT INTO workspaces (
    id, name, slug, type, status, city_id, address, latitude, longitude,
    description, short_description,
    has_wifi, wifi_speed, has_power_outlets, power_outlet_availability,
    seating_capacity, seating_comfort, noise_level,
    has_coffee, has_food, price_range,
    laptop_friendly, good_for_calls, has_natural_light,
    overall_rating, total_reviews, featured
) VALUES
(
    '650e8400-e29b-41d4-a716-446655440001',
    'Café Malea',
    'cafe-malea',
    'cafe',
    'approved',
    '550e8400-e29b-41d4-a716-446655440001', -- Lisbon
    'Rua da Rosa 123, Lisbon',
    38.7142, -9.1459,
    'A cozy neighborhood cafe in Bairro Alto with excellent coffee, reliable WiFi, and plenty of power outlets. Popular among digital nomads and locals alike.',
    'Cozy cafe in Bairro Alto with great WiFi and coffee',
    true, 'fast', true, 4,
    30, 'comfortable', 'moderate',
    true, true, 2,
    true, false, true,
    4.5, 12, true
),
(
    '650e8400-e29b-41d4-a716-446655440002',
    'Workspace LX',
    'workspace-lx',
    'coworking',
    'approved',
    '550e8400-e29b-41d4-a716-446655440001', -- Lisbon
    'Avenida da Liberdade 456, Lisbon',
    38.7223, -9.1425,
    'Modern coworking space in the heart of Lisbon with high-speed internet, meeting rooms, and a vibrant community of entrepreneurs.',
    'Modern coworking space with meeting rooms',
    true, 'very_fast', true, 5,
    100, 'very_comfortable', 'quiet',
    true, true, 3,
    true, true, true,
    4.8, 45, true
),
(
    '650e8400-e29b-41d4-a716-446655440003',
    'Livraria Lello Café',
    'livraria-lello-cafe',
    'cafe',
    'approved',
    '550e8400-e29b-41d4-a716-446655440002', -- Porto
    'Rua das Carmelitas 144, Porto',
    41.1469, -8.6145,
    'Beautiful bookstore cafe with stunning architecture. Great for focused work in a unique atmosphere.',
    'Stunning bookstore cafe with unique atmosphere',
    true, 'moderate', true, 3,
    20, 'comfortable', 'quiet',
    true, true, 2,
    true, false, true,
    4.3, 8, false
),
(
    '650e8400-e29b-41d4-a716-446655440004',
    'Barcelona Cowork',
    'barcelona-cowork',
    'coworking',
    'approved',
    '550e8400-e29b-41d4-a716-446655440003', -- Barcelona
    'Carrer de Mallorca 234, Barcelona',
    41.3935, 2.1649,
    'Professional coworking space near Sagrada Familia with all amenities, including standing desks and phone booths.',
    'Professional space near Sagrada Familia',
    true, 'very_fast', true, 5,
    80, 'very_comfortable', 'quiet',
    true, true, 3,
    true, true, true,
    4.7, 32, true
);

-- Sample Photos (using Unsplash placeholder URLs)
INSERT INTO workspace_photos (workspace_id, url, caption, is_primary, is_approved) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', 'Cozy interior with natural light', true, true),
('650e8400-e29b-41d4-a716-446655440001', 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800', 'Coffee and workspace setup', false, true),

('650e8400-e29b-41d4-a716-446655440002', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 'Modern coworking space', true, true),
('650e8400-e29b-41d4-a716-446655440002', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800', 'Meeting room area', false, true),

('650e8400-e29b-41d4-a716-446655440003', 'https://images.unsplash.com/photo-1481833761820-0509d3217039?w=800', 'Beautiful bookstore interior', true, true),

('650e8400-e29b-41d4-a716-446655440004', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', 'Professional workspace', true, true),
('650e8400-e29b-41d4-a716-446655440004', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800', 'Standing desk area', false, true);

-- Update city workspace counts
UPDATE cities SET workspace_count = (
    SELECT COUNT(*) FROM workspaces 
    WHERE workspaces.city_id = cities.id 
    AND workspaces.status = 'approved'
);

-- Note: These are placeholder images from Unsplash
-- Replace with actual workspace photos when available
-- Format for storage bucket photos: https://[project-ref].supabase.co/storage/v1/object/public/workspace-photos/[filename]
