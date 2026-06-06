-- Lumen workspace import draft generated from lead data.
-- Review before running. Pending rows show in admin, approved rows show publicly.
BEGIN;

INSERT INTO cities (name, slug, country, country_code, workspace_count, featured)
VALUES ('New York', 'new-york-united-states', 'United States', 'US', 0, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  country_code = EXCLUDED.country_code;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Starbucks @ Francis Lewis Boulevard', 'starbucks-francis-lewis-boulevard-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  'Francis Lewis Boulevard, 11358, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 89% laptop-friendly source score, WiFi, power, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  true, true, false,
  NULL, true, true,
  false, true, false,
  true, true, true,
  false, NULL, true,
  NULL, false,
  true, true, true,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/starbucks-francis-lewis-boulevard',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/starbucks-francis-lewis-boulevard","imported_at":"2026-06-06T17:58:14.383Z","import_score":89,"needs_review":true,"suggested_status":"pending","name":"Starbucks @ Francis Lewis Boulevard","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"Francis Lewis Boulevard, 11358, New York","laptopfriendly_score":89,"opening_hours_note":"Mon 05:00 – 21:30; Tue 05:00 – 21:30; Wed 05:00 – 21:30; Thu 05:00 – 21:30; Fri 05:00 – 21:30; Sat 05:00 – 21:30; Sun 05:00 – 21:30","has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":true,"good_for_groups":true,"has_coffee":true,"has_food":true,"has_veg":true,"has_alcohol":false,"has_natural_light":true,"has_outdoor_seating":false,"has_restrooms":true,"is_accessible":true,"has_air_conditioning":true,"allows_pets":false,"has_parking":true,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/starbucks-francis-lewis-boulevard
LaptopFriendly score: 89.
Opening hours note: Mon 05:00 – 21:30; Tue 05:00 – 21:30; Wed 05:00 – 21:30; Thu 05:00 – 21:30; Fri 05:00 – 21:30; Sat 05:00 – 21:30; Sun 05:00 – 21:30.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'La Bomboniera', 'la-bomboniera-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  'Lexington Avenue, 10128, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 40% laptop-friendly source score, WiFi, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  false, NULL,
  NULL, NULL::seating_comfort,
  true, false, NULL::noise_level,
  true, true, false,
  NULL, true, true,
  false, true, true,
  true, true, true,
  true, NULL, false,
  NULL, false,
  false, true, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/la-bomboniera',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/la-bomboniera","imported_at":"2026-06-06T17:58:14.383Z","import_score":40,"needs_review":true,"suggested_status":"pending","name":"La Bomboniera","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"Lexington Avenue, 10128, New York","laptopfriendly_score":40,"opening_hours_note":"Mon 07:30 – 20:00; Tue 07:30 – 20:00; Wed 07:30 – 20:00; Thu 07:30 – 21:00; Fri 07:30 – 21:00; Sat 08:00 – 21:00; Sun 08:00 – 20:00","has_wifi":true,"has_power_outlets":false,"laptop_friendly":false,"good_for_calls":true,"good_for_groups":false,"has_coffee":true,"has_food":true,"has_veg":true,"has_alcohol":true,"has_natural_light":true,"has_outdoor_seating":true,"has_restrooms":true,"is_accessible":true,"has_air_conditioning":true,"allows_pets":true,"has_parking":true,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/la-bomboniera
LaptopFriendly score: 40.
Opening hours note: Mon 07:30 – 20:00; Tue 07:30 – 20:00; Wed 07:30 – 20:00; Thu 07:30 – 21:00; Fri 07:30 – 21:00; Sat 08:00 – 21:00; Sun 08:00 – 20:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Stella & Fly', 'stella-fly-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '1st Avenue, 10128, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 63% laptop-friendly source score, WiFi, power, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  true, true, false,
  NULL, true, false,
  false, false, true,
  true, false, true,
  true, NULL, true,
  NULL, false,
  false, true, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/stella-fly',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/stella-fly","imported_at":"2026-06-06T17:58:14.383Z","import_score":63,"needs_review":true,"suggested_status":"pending","name":"Stella & Fly","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"1st Avenue, 10128, New York","laptopfriendly_score":63,"opening_hours_note":null,"has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":true,"good_for_groups":false,"has_coffee":true,"has_food":true,"has_veg":false,"has_alcohol":true,"has_natural_light":true,"has_outdoor_seating":false,"has_restrooms":true,"is_accessible":false,"has_air_conditioning":true,"allows_pets":true,"has_parking":false,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/stella-fly
LaptopFriendly score: 63.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Cuppa Hive Coffee', 'cuppa-hive-coffee-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '15th Street, 11215, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead. Needs verification.', NULL,
  false, NULL::wifi_speed, false,
  false, NULL,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  false, false, false,
  false, NULL, false,
  NULL, false,
  false, false, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/cuppa-hive-coffee',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/cuppa-hive-coffee","imported_at":"2026-06-06T17:58:14.383Z","import_score":0,"needs_review":true,"suggested_status":"pending","name":"Cuppa Hive Coffee","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"15th Street, 11215, New York","laptopfriendly_score":null,"opening_hours_note":"Mon 07:00 – 18:00; Tue 07:00 – 18:00; Wed 07:00 – 18:00; Thu 07:00 – 18:00; Fri 07:00 – 18:00; Sat 07:00 – 18:00; Sun 07:00 – 18:00","has_wifi":null,"has_power_outlets":null,"laptop_friendly":null,"good_for_calls":null,"good_for_groups":null,"has_coffee":null,"has_food":null,"has_veg":null,"has_alcohol":null,"has_natural_light":null,"has_outdoor_seating":null,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/cuppa-hive-coffee
Opening hours note: Mon 07:00 – 18:00; Tue 07:00 – 18:00; Wed 07:00 – 18:00; Thu 07:00 – 18:00; Fri 07:00 – 18:00; Sat 07:00 – 18:00; Sun 07:00 – 18:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Crossroads Cafe', 'crossroads-cafe-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  'Knickerbocker Avenue, 11237, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 79% laptop-friendly source score, WiFi, power, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  true, false, NULL::noise_level,
  true, true, false,
  NULL, true, false,
  false, true, false,
  true, true, true,
  true, NULL, true,
  NULL, false,
  true, true, true,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/crossroads-cafe',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/crossroads-cafe","imported_at":"2026-06-06T17:58:14.383Z","import_score":79,"needs_review":true,"suggested_status":"pending","name":"Crossroads Cafe","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"Knickerbocker Avenue, 11237, New York","laptopfriendly_score":79,"opening_hours_note":"Mon 08:00 – 20:00; Tue 08:00 – 20:00; Wed 08:00 – 20:00; Thu 08:00 – 20:00; Fri 08:00 – 20:00; Sat 10:00 – 18:00; Sun 10:00 – 18:00","has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":true,"good_for_groups":true,"has_coffee":true,"has_food":true,"has_veg":true,"has_alcohol":true,"has_natural_light":true,"has_outdoor_seating":true,"has_restrooms":true,"is_accessible":true,"has_air_conditioning":true,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/crossroads-cafe
LaptopFriendly score: 79.
Opening hours note: Mon 08:00 – 20:00; Tue 08:00 – 20:00; Wed 08:00 – 20:00; Thu 08:00 – 20:00; Fri 08:00 – 20:00; Sat 10:00 – 18:00; Sun 10:00 – 18:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Empire Deli', 'empire-deli-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '245 9th Ave, 10001, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead. Needs verification.', NULL,
  false, NULL::wifi_speed, false,
  false, NULL,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  false, false, false,
  false, NULL, false,
  NULL, false,
  false, false, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/empire-deli',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/empire-deli","imported_at":"2026-06-06T17:58:14.383Z","import_score":0,"needs_review":true,"suggested_status":"pending","name":"Empire Deli","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"245 9th Ave, 10001, New York","laptopfriendly_score":null,"opening_hours_note":"Mon 05:00 – 01:00; Tue 05:00 – 01:00; Wed 05:00 – 01:00; Thu 05:00 – 01:00; Fri 05:00 – 01:00; Sat 05:00 – 01:00; Sun 05:00 – 01:00","has_wifi":false,"has_power_outlets":null,"laptop_friendly":null,"good_for_calls":null,"good_for_groups":null,"has_coffee":null,"has_food":null,"has_veg":null,"has_alcohol":null,"has_natural_light":null,"has_outdoor_seating":null,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/empire-deli
Opening hours note: Mon 05:00 – 01:00; Tue 05:00 – 01:00; Wed 05:00 – 01:00; Thu 05:00 – 01:00; Fri 05:00 – 01:00; Sat 05:00 – 01:00; Sun 05:00 – 01:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'New York Public Library - Stephen A. Schwarzman Building', 'new-york-public-library-stephen-a-schwarzman-building-new-york', 'library'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '476 5th Ave, 10018, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 76% laptop-friendly source score, WiFi, power. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  true, true, false,
  NULL, true, false,
  false, true, false,
  false, false, false,
  false, NULL, true,
  NULL, false,
  true, false, true,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/new-york-public-library-stephen-a-schwarzman-building',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/new-york-public-library-stephen-a-schwarzman-building","imported_at":"2026-06-06T17:58:14.383Z","import_score":76,"needs_review":true,"suggested_status":"pending","name":"New York Public Library - Stephen A. Schwarzman Building","type":"library","city_name":"New York","country":"United States","country_code":"US","address":"476 5th Ave, 10018, New York","laptopfriendly_score":76,"opening_hours_note":"Mon 10:00 – 18:00; Tue 10:00 – 20:00; Wed 10:00 – 20:00; Thu 10:00 – 18:00; Fri 10:00 – 18:00; Sat 10:00 – 18:00; Sun 13:00 – 17:00","has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":false,"good_for_groups":true,"has_coffee":false,"has_food":false,"has_veg":false,"has_alcohol":false,"has_natural_light":true,"has_outdoor_seating":false,"has_restrooms":true,"is_accessible":true,"has_air_conditioning":true,"allows_pets":false,"has_parking":false,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/new-york-public-library-stephen-a-schwarzman-building
LaptopFriendly score: 76.
Opening hours note: Mon 10:00 – 18:00; Tue 10:00 – 20:00; Wed 10:00 – 20:00; Thu 10:00 – 18:00; Fri 10:00 – 18:00; Sat 10:00 – 18:00; Sun 13:00 – 17:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Fiction Bar/Cafe', 'fiction-bar-cafe-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '308 Hooper St, 11211, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 67% laptop-friendly source score, WiFi, power, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  true, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  true, true, true,
  true, NULL, true,
  NULL, false,
  false, true, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/fiction-bar-cafe',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/fiction-bar-cafe","imported_at":"2026-06-06T17:58:14.383Z","import_score":67,"needs_review":true,"suggested_status":"pending","name":"Fiction Bar/Cafe","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"308 Hooper St, 11211, New York","laptopfriendly_score":67,"opening_hours_note":"Mon 07:00 – 02:00; Tue 07:00 – 02:00; Wed 07:00 – 02:00; Thu 07:00 – 02:00; Fri 07:00 – 02:00; Sat 08:00 – 02:00; Sun 08:00 – 02:00","has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":true,"good_for_groups":false,"has_coffee":true,"has_food":true,"has_veg":true,"has_alcohol":true,"has_natural_light":false,"has_outdoor_seating":true,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/fiction-bar-cafe
LaptopFriendly score: 67.
Opening hours note: Mon 07:00 – 02:00; Tue 07:00 – 02:00; Wed 07:00 – 02:00; Thu 07:00 – 02:00; Fri 07:00 – 02:00; Sat 08:00 – 02:00; Sun 08:00 – 02:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Musette Wine Bar', 'musette-wine-bar-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '420 Malcolm X Blvd, 10037, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 68% laptop-friendly source score, WiFi, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  false, NULL,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  true, true, false,
  NULL, true, true,
  false, true, false,
  true, false, true,
  true, NULL, true,
  NULL, false,
  false, true, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/musette-wine-bar',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/musette-wine-bar","imported_at":"2026-06-06T17:58:14.383Z","import_score":68,"needs_review":true,"suggested_status":"pending","name":"Musette Wine Bar","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"420 Malcolm X Blvd, 10037, New York","laptopfriendly_score":68,"opening_hours_note":"Mon 07:30 – 15:00; Tue 07:30 – 15:00; Wed 07:30 – 15:00; Thu 07:30 – 15:00; Fri 07:00 – 15:00; Sat 08:00 – 15:00; Sun 08:00 – 15:00","has_wifi":true,"has_power_outlets":null,"laptop_friendly":true,"good_for_calls":true,"good_for_groups":false,"has_coffee":true,"has_food":true,"has_veg":null,"has_alcohol":true,"has_natural_light":true,"has_outdoor_seating":null,"has_restrooms":true,"is_accessible":true,"has_air_conditioning":true,"allows_pets":false,"has_parking":true,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/musette-wine-bar
LaptopFriendly score: 68.
Opening hours note: Mon 07:30 – 15:00; Tue 07:30 – 15:00; Wed 07:30 – 15:00; Thu 07:30 – 15:00; Fri 07:00 – 15:00; Sat 08:00 – 15:00; Sun 08:00 – 15:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Home Sweet Harlem', 'home-sweet-harlem-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '1528 Amsterdam Ave, 10031, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 75% laptop-friendly source score, WiFi, power, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  true, false, NULL::noise_level,
  true, true, false,
  NULL, true, true,
  false, true, true,
  true, true, true,
  false, NULL, true,
  NULL, false,
  true, true, true,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/home-sweet-harlem',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/home-sweet-harlem","imported_at":"2026-06-06T17:58:14.383Z","import_score":75,"needs_review":true,"suggested_status":"pending","name":"Home Sweet Harlem","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"1528 Amsterdam Ave, 10031, New York","laptopfriendly_score":75,"opening_hours_note":"Mon Open 24 hours; Tue Open 24 hours; Wed Open 24 hours; Thu 09:00 – 15:00; Fri 09:00 – 15:00; Sat 10:00 – 17:00; Sun 10:00 – 17:00","has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":true,"good_for_groups":true,"has_coffee":true,"has_food":true,"has_veg":true,"has_alcohol":false,"has_natural_light":true,"has_outdoor_seating":true,"has_restrooms":true,"is_accessible":true,"has_air_conditioning":true,"allows_pets":true,"has_parking":true,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/home-sweet-harlem
LaptopFriendly score: 75.
Opening hours note: Mon Open 24 hours; Tue Open 24 hours; Wed Open 24 hours; Thu 09:00 – 15:00; Fri 09:00 – 15:00; Sat 10:00 – 17:00; Sun 10:00 – 17:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Passionfruit Coffee', 'passionfruit-coffee-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '733 Madison St, 11221, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 80% laptop-friendly source score, WiFi, power, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  true, false, NULL::noise_level,
  true, true, false,
  NULL, true, true,
  false, true, false,
  true, true, true,
  false, NULL, true,
  NULL, false,
  true, true, true,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/passionfruit-coffee',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/passionfruit-coffee","imported_at":"2026-06-06T17:58:14.383Z","import_score":80,"needs_review":true,"suggested_status":"pending","name":"Passionfruit Coffee","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"733 Madison St, 11221, New York","laptopfriendly_score":80,"opening_hours_note":"Mon 08:00 – 17:00; Tue 08:00 – 17:00; Wed 08:00 – 17:00; Thu 08:00 – 17:00; Fri 08:00 – 17:00; Sat 08:00 – 17:00; Sun 08:00 – 17:00","has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":true,"good_for_groups":true,"has_coffee":true,"has_food":true,"has_veg":true,"has_alcohol":false,"has_natural_light":true,"has_outdoor_seating":true,"has_restrooms":true,"is_accessible":true,"has_air_conditioning":true,"allows_pets":null,"has_parking":true,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/passionfruit-coffee
LaptopFriendly score: 80.
Opening hours note: Mon 08:00 – 17:00; Tue 08:00 – 17:00; Wed 08:00 – 17:00; Thu 08:00 – 17:00; Fri 08:00 – 17:00; Sat 08:00 – 17:00; Sun 08:00 – 17:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Early Yves Cafe', 'early-yves-cafe-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '210 Patchen Ave, 11233, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead. Needs verification.', NULL,
  false, NULL::wifi_speed, false,
  false, NULL,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  false, false, false,
  false, NULL, false,
  NULL, false,
  false, false, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/early-yves-cafe',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/early-yves-cafe","imported_at":"2026-06-06T17:58:14.383Z","import_score":0,"needs_review":true,"suggested_status":"pending","name":"Early Yves Cafe","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"210 Patchen Ave, 11233, New York","laptopfriendly_score":null,"opening_hours_note":"Mon 08:00 – 17:00; Tue 08:00 – 17:00; Wed 08:00 – 17:00; Thu 08:00 – 17:00; Fri 08:00 – 17:00; Sat 08:00 – 17:00; Sun 08:00 – 17:00","has_wifi":null,"has_power_outlets":null,"laptop_friendly":null,"good_for_calls":null,"good_for_groups":null,"has_coffee":null,"has_food":null,"has_veg":null,"has_alcohol":null,"has_natural_light":null,"has_outdoor_seating":null,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/early-yves-cafe
Opening hours note: Mon 08:00 – 17:00; Tue 08:00 – 17:00; Wed 08:00 – 17:00; Thu 08:00 – 17:00; Fri 08:00 – 17:00; Sat 08:00 – 17:00; Sun 08:00 – 17:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  '787 Coffee Co.', '787-coffee-co-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '251 W 30th St, 10001, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead. Needs verification.', NULL,
  false, NULL::wifi_speed, false,
  false, NULL,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  false, false, false,
  false, NULL, false,
  NULL, false,
  false, false, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/787-coffee-co',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/787-coffee-co","imported_at":"2026-06-06T17:58:14.383Z","import_score":0,"needs_review":true,"suggested_status":"pending","name":"787 Coffee Co.","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"251 W 30th St, 10001, New York","laptopfriendly_score":null,"opening_hours_note":"Mon 07:00 – 20:00; Tue 07:00 – 20:00; Wed 07:00 – 20:00; Thu 07:00 – 20:00; Fri 07:00 – 20:00; Sat 07:00 – 20:00; Sun 08:00 – 20:00","has_wifi":null,"has_power_outlets":null,"laptop_friendly":null,"good_for_calls":null,"good_for_groups":null,"has_coffee":null,"has_food":null,"has_veg":null,"has_alcohol":null,"has_natural_light":null,"has_outdoor_seating":null,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/787-coffee-co
Opening hours note: Mon 07:00 – 20:00; Tue 07:00 – 20:00; Wed 07:00 – 20:00; Thu 07:00 – 20:00; Fri 07:00 – 20:00; Sat 07:00 – 20:00; Sun 08:00 – 20:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Remi Flower & Coffee', 'remi-flower-coffee-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '906 2nd Ave, 10017, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead. Needs verification.', NULL,
  false, NULL::wifi_speed, false,
  false, NULL,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  false, false, false,
  false, NULL, false,
  NULL, false,
  false, false, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/remi-flower-coffee',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/remi-flower-coffee","imported_at":"2026-06-06T17:58:14.383Z","import_score":0,"needs_review":true,"suggested_status":"pending","name":"Remi Flower & Coffee","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"906 2nd Ave, 10017, New York","laptopfriendly_score":null,"opening_hours_note":"Mon 07:00 – 18:00; Tue 07:00 – 18:00; Wed 07:00 – 18:00; Thu 07:00 – 18:00; Fri 07:00 – 18:00; Sat 07:00 – 18:00; Sun 07:00 – 18:00","has_wifi":null,"has_power_outlets":null,"laptop_friendly":null,"good_for_calls":null,"good_for_groups":null,"has_coffee":null,"has_food":null,"has_veg":null,"has_alcohol":null,"has_natural_light":null,"has_outdoor_seating":null,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/remi-flower-coffee
Opening hours note: Mon 07:00 – 18:00; Tue 07:00 – 18:00; Wed 07:00 – 18:00; Thu 07:00 – 18:00; Fri 07:00 – 18:00; Sat 07:00 – 18:00; Sun 07:00 – 18:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'The Sleeping Cat', 'the-sleeping-cat-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '160 7th Ave, 10011, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 69% laptop-friendly source score, WiFi, power, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  true, true, true,
  false, NULL, true,
  NULL, false,
  true, true, true,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/the-sleeping-cat',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/the-sleeping-cat","imported_at":"2026-06-06T17:58:14.383Z","import_score":69,"needs_review":true,"suggested_status":"pending","name":"The Sleeping Cat","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"160 7th Ave, 10011, New York","laptopfriendly_score":69,"opening_hours_note":"Mon 08:00 – 22:00; Tue 08:00 – 22:00; Wed 08:00 – 22:00; Thu 08:00 – 22:00; Fri 08:00 – 22:00; Sat 08:00 – 22:00; Sun 08:00 – 22:00","has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":true,"good_for_groups":true,"has_coffee":true,"has_food":true,"has_veg":true,"has_alcohol":null,"has_natural_light":null,"has_outdoor_seating":null,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/the-sleeping-cat
LaptopFriendly score: 69.
Opening hours note: Mon 08:00 – 22:00; Tue 08:00 – 22:00; Wed 08:00 – 22:00; Thu 08:00 – 22:00; Fri 08:00 – 22:00; Sat 08:00 – 22:00; Sun 08:00 – 22:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Kaffe Landskap NYC (South)', 'kaffe-landskap-nyc-south-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '275 Greenwich St, 10007, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead. Needs verification.', NULL,
  false, NULL::wifi_speed, false,
  false, NULL,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  false, false, false,
  false, NULL, false,
  NULL, false,
  false, false, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/kaffe-landskap-nyc-south',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/kaffe-landskap-nyc-south","imported_at":"2026-06-06T17:58:14.383Z","import_score":0,"needs_review":true,"suggested_status":"pending","name":"Kaffe Landskap NYC (South)","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"275 Greenwich St, 10007, New York","laptopfriendly_score":null,"opening_hours_note":"Mon 06:30 – 18:00; Tue 06:30 – 18:00; Wed 06:30 – 18:00; Thu 06:30 – 18:00; Fri 06:30 – 18:00; Sat 07:00 – 17:00; Sun 07:00 – 17:00","has_wifi":null,"has_power_outlets":null,"laptop_friendly":null,"good_for_calls":null,"good_for_groups":null,"has_coffee":null,"has_food":null,"has_veg":null,"has_alcohol":null,"has_natural_light":null,"has_outdoor_seating":null,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/kaffe-landskap-nyc-south
Opening hours note: Mon 06:30 – 18:00; Tue 06:30 – 18:00; Wed 06:30 – 18:00; Thu 06:30 – 18:00; Fri 06:30 – 18:00; Sat 07:00 – 17:00; Sun 07:00 – 17:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Starbucks @ 684 6th Ave', 'starbucks-684-6th-ave-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '684 6th Ave, 10010, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 54% laptop-friendly source score, WiFi, power, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  true, true, true,
  false, NULL, false,
  NULL, false,
  false, true, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/starbucks-684-6th-ave',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/starbucks-684-6th-ave","imported_at":"2026-06-06T17:58:14.383Z","import_score":54,"needs_review":true,"suggested_status":"pending","name":"Starbucks @ 684 6th Ave","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"684 6th Ave, 10010, New York","laptopfriendly_score":54,"opening_hours_note":"Mon 05:30 – 20:30; Tue 05:30 – 20:30; Wed 05:30 – 20:30; Thu 05:30 – 20:30; Fri 05:30 – 20:30; Sat 06:30 – 20:30; Sun 06:30 – 20:00","has_wifi":true,"has_power_outlets":true,"laptop_friendly":false,"good_for_calls":true,"good_for_groups":false,"has_coffee":true,"has_food":true,"has_veg":true,"has_alcohol":false,"has_natural_light":false,"has_outdoor_seating":false,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/starbucks-684-6th-ave
LaptopFriendly score: 54.
Opening hours note: Mon 05:30 – 20:30; Tue 05:30 – 20:30; Wed 05:30 – 20:30; Thu 05:30 – 20:30; Fri 05:30 – 20:30; Sat 06:30 – 20:30; Sun 06:30 – 20:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Starbucks @ 815 Hutchinson Riv Pkwy', 'starbucks-815-hutchinson-riv-pkwy-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '815 Hutchinson Riv Pkwy, 10465, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 98% laptop-friendly source score, WiFi, power, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  true, false, false,
  NULL, false, true,
  false, false, false,
  false, false, true,
  false, NULL, true,
  NULL, false,
  false, false, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/starbucks-815-hutchinson-riv-pkwy',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/starbucks-815-hutchinson-riv-pkwy","imported_at":"2026-06-06T17:58:14.383Z","import_score":98,"needs_review":true,"suggested_status":"pending","name":"Starbucks @ 815 Hutchinson Riv Pkwy","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"815 Hutchinson Riv Pkwy, 10465, New York","laptopfriendly_score":98,"opening_hours_note":"Mon 06:00 – 20:00; Tue 06:00 – 20:00; Wed 06:00 – 20:00; Thu 06:00 – 20:00; Fri 06:00 – 20:00; Sat 06:30 – 20:00; Sun 06:30 – 20:00","has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":null,"good_for_groups":null,"has_coffee":true,"has_food":null,"has_veg":null,"has_alcohol":null,"has_natural_light":true,"has_outdoor_seating":false,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":true,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/starbucks-815-hutchinson-riv-pkwy
LaptopFriendly score: 98.
Opening hours note: Mon 06:00 – 20:00; Tue 06:00 – 20:00; Wed 06:00 – 20:00; Thu 06:00 – 20:00; Fri 06:00 – 20:00; Sat 06:30 – 20:00; Sun 06:30 – 20:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'Covert Cafe', 'covert-cafe-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '3 Covert St, 11207, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead. Needs verification.', NULL,
  false, NULL::wifi_speed, false,
  false, NULL,
  NULL, NULL::seating_comfort,
  false, false, NULL::noise_level,
  false, false, false,
  NULL, false, false,
  false, false, false,
  false, false, false,
  false, NULL, false,
  NULL, false,
  false, false, false,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/covert-cafe',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/covert-cafe","imported_at":"2026-06-06T17:58:14.383Z","import_score":0,"needs_review":true,"suggested_status":"pending","name":"Covert Cafe","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"3 Covert St, 11207, New York","laptopfriendly_score":null,"opening_hours_note":"Mon 08:00 – 17:00; Tue 08:00 – 17:00; Wed 08:00 – 17:00; Thu 08:00 – 17:00; Fri 08:00 – 17:00; Sat 08:00 – 17:00; Sun 08:00 – 17:00","has_wifi":null,"has_power_outlets":null,"laptop_friendly":null,"good_for_calls":null,"good_for_groups":null,"has_coffee":null,"has_food":null,"has_veg":null,"has_alcohol":null,"has_natural_light":null,"has_outdoor_seating":null,"has_restrooms":null,"is_accessible":null,"has_air_conditioning":null,"allows_pets":null,"has_parking":null,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/covert-cafe
Opening hours note: Mon 08:00 – 17:00; Tue 08:00 – 17:00; Wed 08:00 – 17:00; Thu 08:00 – 17:00; Fri 08:00 – 17:00; Sat 08:00 – 17:00; Sun 08:00 – 17:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

INSERT INTO workspaces (
  name, slug, type, status, city_id, address, latitude, longitude, website, phone,
  description, short_description, opening_hours, has_wifi, wifi_speed, wifi_password_required,
  has_power_outlets, power_outlet_availability, seating_capacity, seating_comfort,
  has_outdoor_seating, has_standing_desks, noise_level, has_natural_light,
  has_air_conditioning, has_heating, music_volume, has_restrooms, has_parking,
  has_bike_parking, is_accessible, allows_pets, has_food, has_veg, has_coffee,
  has_alcohol, price_range, laptop_friendly, time_limit_hours, minimum_purchase_required,
  good_for_meetings, good_for_calls, good_for_groups, location_source, location_provider,
  location_provider_id, location_confidence, location_raw, admin_notes
)
VALUES (
  'City League Coffee Roasters', 'city-league-coffee-roasters-new-york', 'cafe'::workspace_type, 'pending'::workspace_status,
  (SELECT id FROM cities WHERE slug = 'new-york-united-states' LIMIT 1),
  '6808 4th Ave, 11220, New York', NULL, NULL, NULL, NULL,
  NULL, 'Imported lead: 93% laptop-friendly source score, WiFi, power, calls, coffee. Needs verification.', NULL,
  true, NULL::wifi_speed, false,
  true, 3,
  NULL, NULL::seating_comfort,
  true, false, NULL::noise_level,
  true, true, false,
  NULL, true, true,
  false, true, true,
  true, true, true,
  false, NULL, true,
  NULL, false,
  true, true, true,
  'external_lead', 'laptopfriendly', 'https://laptopfriendly.co/new-york/city-league-coffee-roasters',
  0.35, '{"source":"laptopfriendly","source_url":"https://laptopfriendly.co/new-york/city-league-coffee-roasters","imported_at":"2026-06-06T17:58:14.383Z","import_score":93,"needs_review":true,"suggested_status":"pending","name":"City League Coffee Roasters","type":"cafe","city_name":"New York","country":"United States","country_code":"US","address":"6808 4th Ave, 11220, New York","laptopfriendly_score":93,"opening_hours_note":"Mon 07:00 – 17:00; Tue 07:00 – 17:00; Wed 07:00 – 17:00; Thu 07:00 – 17:00; Fri 07:00 – 17:00; Sat 08:00 – 16:00; Sun 08:00 – 16:00","has_wifi":true,"has_power_outlets":true,"laptop_friendly":true,"good_for_calls":true,"good_for_groups":true,"has_coffee":true,"has_food":true,"has_veg":true,"has_alcohol":false,"has_natural_light":true,"has_outdoor_seating":true,"has_restrooms":true,"is_accessible":true,"has_air_conditioning":true,"allows_pets":true,"has_parking":true,"review_note":"Verify facts before publishing. Review text and photos were intentionally not copied."}'::jsonb, 'Lead from LaptopFriendly. Source: https://laptopfriendly.co/new-york/city-league-coffee-roasters
LaptopFriendly score: 93.
Opening hours note: Mon 07:00 – 17:00; Tue 07:00 – 17:00; Wed 07:00 – 17:00; Thu 07:00 – 17:00; Fri 07:00 – 17:00; Sat 08:00 – 16:00; Sun 08:00 – 16:00.
Verify address, coordinates, photos, policies, and workability before approval.
Generated 2026-06-06T18:01:37.146Z.'
)
ON CONFLICT (slug) DO UPDATE SET
  admin_notes = EXCLUDED.admin_notes,
  location_raw = EXCLUDED.location_raw,
  location_provider_id = EXCLUDED.location_provider_id;

COMMIT;
