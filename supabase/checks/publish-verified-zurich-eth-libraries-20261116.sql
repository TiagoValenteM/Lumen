-- Reviewed one-off dataset. See docs/product/verified-library-pilot.md.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  target_city uuid;
  place_id uuid;
  item record;
  opening jsonb;
  laptops jsonb;
  coverage jsonb;
  common_exceptions jsonb;
  policy_source constant text := 'https://library.ethz.ch/en/find-media/borrowing-and-using/frequently-asked-questions.html';
  calendar_source constant text := 'https://library.ethz.ch/en/about-us-and-locations/locations-and-opening-hours/special-opening-hours.html';
BEGIN
  SELECT id INTO STRICT target_city FROM public.cities WHERE name = 'Zürich' AND country = 'Switzerland';
  SELECT jsonb_object_agg(date '2026-12-25' + day_offset, '[]'::jsonb)
  INTO common_exceptions FROM generate_series(0, 9) AS days(day_offset);
  FOR item IN SELECT * FROM (VALUES
    ('eth-library-reading-room-zurich', 'ETH Library - Reading Room',
      'Rämistrasse 101, 8006 Zürich', 47.37648010, 8.54826832, '+41446322135',
      'https://library.ethz.ch/en/about-us-and-locations/locations-and-opening-hours/reading-room.html',
      'Individual study desks in room HG H 30.1. Public guest Wi-Fi supports personal devices. The research-terminal limit does not establish a limit for your own laptop.',
      '{"Mon":[[480,1320]],"Tue":[[480,1320]],"Wed":[[480,1320]],"Thu":[[480,1320]],"Fri":[[480,1320]],"Sat":[[540,1020]],"Sun":[[540,1020]]}'::jsonb,
      '{"2026-11-21":[],"2026-11-28":[[540,1020]],"2026-11-29":[],"2026-12-24":[[480,720]]}'::jsonb),
    ('eth-architecture-civil-engineering-library-zurich', 'ETH Architecture and Civil Engineering Library',
      'Stefano-Franscini-Platz 5, 8049 Zürich', 47.40825272, 8.50672817, '+41446332906',
      'https://library.ethz.ch/en/ueber-uns-und-standorte/locations-and-opening-hours/architecture-and-civil-engineering-library.html',
      'Study desks at the ETH Hönggerberg campus with public guest Wi-Fi. No personal-device stay limit was confirmed.',
      '{"Mon":[[480,1260]],"Tue":[[480,1260]],"Wed":[[480,1260]],"Thu":[[480,1260]],"Fri":[[480,1260]],"Sat":[],"Sun":[]}'::jsonb,
      '{"2026-12-24":[[480,720]]}'::jsonb)
  ) AS places(slug,name,address,lat,lon,phone,source,note,weekly,exceptions)
  LOOP
    IF EXISTS (SELECT FROM public.workspaces WHERE slug = item.slug) THEN CONTINUE; END IF;
    IF EXISTS (SELECT FROM public.workspaces WHERE city_id = target_city AND (
      lower(name) = lower(item.name) OR lower(address) = lower(item.address) OR
      (abs(latitude - item.lat) < 0.00035 AND abs(longitude - item.lon) < 0.00035)
    )) THEN RAISE EXCEPTION 'Check possible duplicate: %', item.name; END IF;
    coverage := jsonb_build_object('coverageSource',calendar_source,'exceptionsCheckedThrough','2027-01-03',
      'weekly',item.weekly,'exceptions',common_exceptions || item.exceptions);
    opening := coverage || jsonb_build_object('source',item.source);
    laptops := coverage || jsonb_build_object('source',policy_source);
    IF NOT lumen_private.valid_session_policy(opening,(now() AT TIME ZONE 'Europe/Zurich')::date,false,true)
      OR NOT lumen_private.valid_session_policy(laptops,(now() AT TIME ZONE 'Europe/Zurich')::date,true,true)
    THEN RAISE EXCEPTION 'Invalid or out-of-date evidence: %', item.name; END IF;
    INSERT INTO public.workspaces (city_id,slug,name,type,status,address,latitude,longitude,website,phone,
      description,laptop_friendly,has_wifi,time_limit_hours,last_verified_at)
    VALUES (target_city,item.slug,item.name,'library','approved',item.address,item.lat,item.lon,item.source,item.phone,
      item.note,true,true,NULL,now()) RETURNING id INTO place_id;
    INSERT INTO public.workspace_session_hours (workspace_id,published,checked_at)
    VALUES (place_id,jsonb_build_object('timeZone','Europe/Zurich','opening',opening,'laptopAccess',laptops,'note',item.note),now());
  END LOOP;
END $$;
COMMIT;
