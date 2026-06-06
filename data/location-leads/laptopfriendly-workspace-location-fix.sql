-- Lumen location fix generated from Nominatim/OpenStreetMap geocoding.
-- Run after laptopfriendly-workspace-import.sql.
-- Review any rows that remain without coordinates.
BEGIN;

UPDATE workspaces
SET
  address = '32-02 Francis Lewis Boulevard, Queens, New York, New York, 11358',
  latitude = 40.7687226,
  longitude = -73.7921822,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/9664668087","provider_url":"https://www.openstreetmap.org/node/9664668087","display_name":"Starbucks, 32-02, Francis Lewis Boulevard, Queens, Queens County, New York, 11358, United States","class":null,"type":"cafe","importance":0.00009175936522464359,"place_rank":30,"query":"Starbucks Francis Lewis Boulevard, Francis Lewis Boulevard, 11358, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 32-02 Francis Lewis Boulevard, Queens, New York, New York, 11358. Coordinates: 40.7687226, -73.7921822. OSM: https://www.openstreetmap.org/node/9664668087.')
WHERE slug = 'starbucks-francis-lewis-boulevard-new-york';

UPDATE workspaces
SET
  address = '1378 Lexington Avenue, Manhattan, New York, New York, 10128',
  latitude = 40.7826516,
  longitude = -73.9534733,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/2724165752","provider_url":"https://www.openstreetmap.org/node/2724165752","display_name":"La Bomboniera, 1378, Lexington Avenue, Carnegie Hill, Manhattan Community Board 8, Manhattan, New York County, New York, 10128, United States","class":null,"type":"cafe","importance":0.00009175936522464359,"place_rank":30,"query":"La Bomboniera, Lexington Avenue, 10128, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 1378 Lexington Avenue, Manhattan, New York, New York, 10128. Coordinates: 40.7826516, -73.9534733. OSM: https://www.openstreetmap.org/node/2724165752.')
WHERE slug = 'la-bomboniera-new-york';

UPDATE workspaces
SET
  address = '1705 1st Avenue, Manhattan, New York, New York, 10128',
  latitude = 40.7785117,
  longitude = -73.9483986,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/13389975250","provider_url":"https://www.openstreetmap.org/node/13389975250","display_name":"Stella & Fly, 1705, 1st Avenue, Yorkville, Manhattan Community Board 8, Manhattan, New York County, New York, 10128, United States","class":null,"type":"cafe","importance":0.00009175936522464359,"place_rank":30,"query":"Stella & Fly, 1st Avenue, 10128, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 1705 1st Avenue, Manhattan, New York, New York, 10128. Coordinates: 40.7785117, -73.9483986. OSM: https://www.openstreetmap.org/node/13389975250.')
WHERE slug = 'stella-fly-new-york';

UPDATE workspaces
SET
  address = '428 15th Street, Brooklyn, New York, New York, 11215',
  latitude = 40.6618916,
  longitude = -73.9819584,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/6008609702","provider_url":"https://www.openstreetmap.org/node/6008609702","display_name":"Cuppa Hive Espresso Bar, 428, 15th Street, Park Slope, Brooklyn, Kings County, New York, 11215, United States","class":null,"type":"cafe","importance":0.00009175936522464359,"place_rank":30,"query":"Cuppa Hive Coffee, 15th Street, 11215, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 428 15th Street, Brooklyn, New York, New York, 11215. Coordinates: 40.6618916, -73.9819584. OSM: https://www.openstreetmap.org/node/6008609702.')
WHERE slug = 'cuppa-hive-coffee-new-york';

UPDATE workspaces
SET
  address = '119 Knickerbocker Avenue, Brooklyn, New York, New York, 11237',
  latitude = 40.7050509,
  longitude = -73.928984,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/5735248331","provider_url":"https://www.openstreetmap.org/node/5735248331","display_name":"Crossroads Cafe, 119, Knickerbocker Avenue, Bushwick, Brooklyn, Kings County, New York, 11237, United States","class":null,"type":"cafe","importance":0.00009175936522464359,"place_rank":30,"query":"Crossroads Cafe, Knickerbocker Avenue, 11237, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 119 Knickerbocker Avenue, Brooklyn, New York, New York, 11237. Coordinates: 40.7050509, -73.928984. OSM: https://www.openstreetmap.org/node/5735248331.')
WHERE slug = 'crossroads-cafe-new-york';

UPDATE workspaces
SET
  address = '245 9th Avenue, Manhattan, New York, New York, 10001',
  latitude = 40.7477601,
  longitude = -74.0006469,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/6169673876","provider_url":"https://www.openstreetmap.org/node/6169673876","display_name":"Empire Grocery & Deli, 245, 9th Avenue, Chelsea District, Manhattan Community Board 4, Manhattan, New York County, New York, 10001, United States","class":null,"type":"convenience","importance":0.00009175936522464359,"place_rank":30,"query":"Empire Deli, 245 9th Ave, 10001, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 245 9th Avenue, Manhattan, New York, New York, 10001. Coordinates: 40.7477601, -74.0006469. OSM: https://www.openstreetmap.org/node/6169673876.')
WHERE slug = 'empire-deli-new-york';

UPDATE workspaces
SET
  address = '476 5th Avenue, Manhattan, New York, New York, 10018',
  latitude = 40.7533445,
  longitude = -73.9821524,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"way/265302076","provider_url":"https://www.openstreetmap.org/way/265302076","display_name":"Stephen A. Schwarzman Building, 476, 5th Avenue, Midtown South, Manhattan Community Board 5, Manhattan, New York County, New York, 10018, United States","class":null,"type":"library","importance":0.46977615874031897,"place_rank":30,"query":"476 5th Ave, 10018, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 476 5th Avenue, Manhattan, New York, New York, 10018. Coordinates: 40.7533445, -73.9821524. OSM: https://www.openstreetmap.org/way/265302076.')
WHERE slug = 'new-york-public-library-stephen-a-schwarzman-building-new-york';

UPDATE workspaces
SET
  address = '308 Hooper Street, Brooklyn, New York, New York, 11211',
  latitude = 40.7073204,
  longitude = -73.9537223,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/5613044405","provider_url":"https://www.openstreetmap.org/node/5613044405","display_name":"The Fiction, 308, Hooper Street, Williamsburg, Brooklyn, Kings County, New York, 11211, United States","class":null,"type":"cafe","importance":0.00009175936522464359,"place_rank":30,"query":"308 Hooper St, 11211, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 308 Hooper Street, Brooklyn, New York, New York, 11211. Coordinates: 40.7073204, -73.9537223. OSM: https://www.openstreetmap.org/node/5613044405.')
WHERE slug = 'fiction-bar-cafe-new-york';

UPDATE workspaces
SET
  address = '420 Malcolm X Boulevard, Manhattan, New York, New York, 10037',
  latitude = 40.8115544,
  longitude = -73.9423984,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.8,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/2767493092","provider_url":"https://www.openstreetmap.org/node/2767493092","display_name":"420, Malcolm X Boulevard, Harlem, Manhattan Community Board 10, Manhattan, New York County, New York, 10037, United States","class":null,"type":"house","importance":0.00009175936522464359,"place_rank":30,"query":"420 Malcolm X Blvd, 10037, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 420 Malcolm X Boulevard, Manhattan, New York, New York, 10037. Coordinates: 40.8115544, -73.9423984. OSM: https://www.openstreetmap.org/node/2767493092.')
WHERE slug = 'musette-wine-bar-new-york';

UPDATE workspaces
SET
  address = '1528 Amsterdam Avenue, Manhattan, New York, New York, 10031',
  latitude = 40.8193775,
  longitude = -73.9522582,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/4176537295","provider_url":"https://www.openstreetmap.org/node/4176537295","display_name":"Home Sweet Harlem, 1528, Amsterdam Avenue, Hamilton Heights, Manhattan Community Board 9, Manhattan, New York County, New York, 10031, United States","class":null,"type":"restaurant","importance":0.00009175936522464359,"place_rank":30,"query":"Home Sweet Harlem, 1528 Amsterdam Ave, 10031, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 1528 Amsterdam Avenue, Manhattan, New York, New York, 10031. Coordinates: 40.8193775, -73.9522582. OSM: https://www.openstreetmap.org/node/4176537295.')
WHERE slug = 'home-sweet-harlem-new-york';

UPDATE workspaces
SET
  address = '733 Madison Street, Brooklyn, New York, New York, 11221',
  latitude = 40.6875245,
  longitude = -73.9273769,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.8,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"way/250302678","provider_url":"https://www.openstreetmap.org/way/250302678","display_name":"733, Madison Street, Bedford-Stuyvesant, Bushwick, Brooklyn, Kings County, New York, 11221, United States","class":null,"type":"yes","importance":0.00009175936522464359,"place_rank":30,"query":"733 Madison St, 11221, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 733 Madison Street, Brooklyn, New York, New York, 11221. Coordinates: 40.6875245, -73.9273769. OSM: https://www.openstreetmap.org/way/250302678.')
WHERE slug = 'passionfruit-coffee-new-york';

UPDATE workspaces
SET
  address = '210 Patchen Avenue, Brooklyn, New York, New York, 11233',
  latitude = 40.6836278,
  longitude = -73.9263876,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/10065571478","provider_url":"https://www.openstreetmap.org/node/10065571478","display_name":"Early Yves, 210, Patchen Avenue, Brooklyn, Kings County, New York, 11233, United States","class":null,"type":"cafe","importance":0.00009175936522464359,"place_rank":30,"query":"Early Yves Cafe, 210 Patchen Ave, 11233, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 210 Patchen Avenue, Brooklyn, New York, New York, 11233. Coordinates: 40.6836278, -73.9263876. OSM: https://www.openstreetmap.org/node/10065571478.')
WHERE slug = 'early-yves-cafe-new-york';

UPDATE workspaces
SET
  address = '251 West 30th Street, Manhattan, New York, New York, 10001',
  latitude = 40.749457,
  longitude = -73.9942666,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.8,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"way/264678460","provider_url":"https://www.openstreetmap.org/way/264678460","display_name":"251, West 30th Street, Chelsea District, Manhattan Community Board 5, Manhattan, New York County, New York, 10001, United States","class":null,"type":"yes","importance":0.00009175936522464359,"place_rank":30,"query":"251 W 30th St, 10001, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 251 West 30th Street, Manhattan, New York, New York, 10001. Coordinates: 40.749457, -73.9942666. OSM: https://www.openstreetmap.org/way/264678460.')
WHERE slug = '787-coffee-co-new-york';

UPDATE workspaces
SET
  address = '906 2nd Avenue, Manhattan, New York, New York, 10017',
  latitude = 40.7538106,
  longitude = -73.9690686,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/11557681070","provider_url":"https://www.openstreetmap.org/node/11557681070","display_name":"Remi Flower & Coffee, 906, 2nd Avenue, Turtle Bay, Manhattan Community Board 6, Manhattan, New York County, New York, 10017, United States","class":null,"type":"cafe","importance":0.00009175936522464359,"place_rank":30,"query":"Remi Flower & Coffee, 906 2nd Ave, 10017, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 906 2nd Avenue, Manhattan, New York, New York, 10017. Coordinates: 40.7538106, -73.9690686. OSM: https://www.openstreetmap.org/node/11557681070.')
WHERE slug = 'remi-flower-coffee-new-york';

UPDATE workspaces
SET
  address = '160 7th Avenue, Manhattan, New York, New York, 10011',
  latitude = 40.7421822,
  longitude = -73.9972727,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.8,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/2703025065","provider_url":"https://www.openstreetmap.org/node/2703025065","display_name":"160, 7th Avenue, Chelsea District, Manhattan Community Board 4, Manhattan, New York County, New York, 10011, United States","class":null,"type":"house","importance":0.00009175936522464359,"place_rank":30,"query":"160 7th Ave, 10011, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 160 7th Avenue, Manhattan, New York, New York, 10011. Coordinates: 40.7421822, -73.9972727. OSM: https://www.openstreetmap.org/node/2703025065.')
WHERE slug = 'the-sleeping-cat-new-york';

UPDATE workspaces
SET
  address = '275 Greenwich Street, Manhattan, New York, New York, 10007',
  latitude = 40.7149834,
  longitude = -74.011137,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"node/1934522990","provider_url":"https://www.openstreetmap.org/node/1934522990","display_name":"Chipotle, 275, Greenwich Street, Tribeca, Lower Manhattan, Manhattan, New York County, New York, 10007, United States","class":null,"type":"fast_food","importance":0.00009175936522464359,"place_rank":30,"query":"275 Greenwich St, 10007, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 275 Greenwich Street, Manhattan, New York, New York, 10007. Coordinates: 40.7149834, -74.011137. OSM: https://www.openstreetmap.org/node/1934522990.')
WHERE slug = 'kaffe-landskap-nyc-south-new-york';

UPDATE workspaces
SET
  address = '684 6th Avenue, Manhattan, New York, New York, 10010',
  latitude = 40.7418357,
  longitude = -73.9932112,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.8,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"way/264645798","provider_url":"https://www.openstreetmap.org/way/264645798","display_name":"684, 6th Avenue, Flatiron District, Manhattan Community Board 5, Manhattan, New York County, New York, 10010, United States","class":null,"type":"yes","importance":0.00009175936522464359,"place_rank":30,"query":"684 6th Ave, 10010, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 684 6th Avenue, Manhattan, New York, New York, 10010. Coordinates: 40.7418357, -73.9932112. OSM: https://www.openstreetmap.org/way/264645798.')
WHERE slug = 'starbucks-684-6th-ave-new-york';

UPDATE workspaces
SET
  address = '815 Hutchinson River Parkway, The Bronx, New York, New York, 10465',
  latitude = 40.8236308,
  longitude = -73.837453,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.7,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"way/429027547","provider_url":"https://www.openstreetmap.org/way/429027547","display_name":"Throggs Neck Shopping Center, 815, Hutchinson River Parkway, The Bronx, Bronx County, New York, 10465, United States","class":"shop","type":"mall","importance":0.00009175936522464359,"place_rank":30,"query":"815 Hutchinson River Parkway, Bronx, NY 10465","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 815 Hutchinson River Parkway, The Bronx, New York, New York, 10465. Coordinates: 40.8236308, -73.837453. OSM: https://www.openstreetmap.org/way/429027547.')
WHERE slug = 'starbucks-815-hutchinson-riv-pkwy-new-york';

UPDATE workspaces
SET
  address = '3 Covert Street, Brooklyn, New York, New York, 11207',
  latitude = 40.6849974,
  longitude = -73.9137898,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.75,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"way/249938532","provider_url":"https://www.openstreetmap.org/way/249938532","display_name":"3, Covert Street, Brooklyn, Kings County, New York, 11207, United States","class":null,"type":"apartments","importance":0.00009175936522464359,"place_rank":30,"query":"3 Covert St, 11207, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 3 Covert Street, Brooklyn, New York, New York, 11207. Coordinates: 40.6849974, -73.9137898. OSM: https://www.openstreetmap.org/way/249938532.')
WHERE slug = 'covert-cafe-new-york';

UPDATE workspaces
SET
  address = '6808 4th Avenue, Brooklyn, New York, New York, 11220',
  latitude = 40.635163,
  longitude = -74.0235976,
  location_source = 'external_lead',
  location_provider = 'laptopfriendly+nominatim',
  location_confidence = 0.8,
  location_raw = COALESCE(location_raw, '{}'::jsonb) || '{"geocoding":{"provider":"nominatim","provider_id":"way/248498408","provider_url":"https://www.openstreetmap.org/way/248498408","display_name":"6808, 4th Avenue, Bay Ridge, Brooklyn, Kings County, New York, 11220, United States","class":null,"type":"yes","importance":0.00009175936522464359,"place_rank":30,"query":"6808 4th Ave, 11220, New York, New York, United States","geocoded_at":"2026-06-06T18:10:13.935Z"}}'::jsonb,
  admin_notes = CONCAT_WS(E'\n', admin_notes, 'Location enriched from OpenStreetMap/Nominatim. Matched address: 6808 4th Avenue, Brooklyn, New York, New York, 11220. Coordinates: 40.635163, -74.0235976. OSM: https://www.openstreetmap.org/way/248498408.')
WHERE slug = 'city-league-coffee-roasters-new-york';

COMMIT;
