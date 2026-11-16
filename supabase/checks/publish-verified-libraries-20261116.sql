-- Reviewed one-off dataset, not a schema migration. See docs/product/verified-library-pilot.md.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE item record; place_id uuid; target_city uuid; opening jsonb; laptops jsonb; evidence jsonb;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('Zürich', 'Switzerland', 'zentralbibliothek-zurich', 'Zentralbibliothek Zürich',
      'Zähringerplatz 6, 8001 Zürich', 47.37410355, 8.54492092, 'Europe/Zurich',
      'https://www.zb.uzh.ch/en/ueber-uns/kontakt', 'https://www.zb.uzh.ch/en/services/lernplatze',
      'https://www.zb.uzh.ch/en/ueber-uns/kontakt', '+41442683100', true,
      'Public reading rooms P0–P3. Keep devices silent. No personal-device stay limit was confirmed.',
      '2027-01-10',
      '{"Mon":[[480,1320]],"Tue":[[480,1320]],"Wed":[[480,1320]],"Thu":[[480,1320]],"Fri":[[480,1320]],"Sat":[[540,1140]],"Sun":[[540,1140]]}'::jsonb,
      '{"2026-11-16":[[480,1200]],"2026-11-17":[[480,1200]],"2026-11-18":[[480,1200]],"2026-11-19":[[480,1200]],"2026-11-20":[[480,1200]],"2026-11-21":[[540,1020]],"2026-11-22":[[540,1020]],"2026-12-24":[],"2026-12-25":[],"2026-12-26":[[540,1140]],"2026-12-31":[[480,1020]],"2027-01-01":[],"2027-01-02":[]}'::jsonb),
    ('New York', 'United States', 'brooklyn-public-library-central-new-york', 'Brooklyn Public Library - Central Library',
      '10 Grand Army Plaza, Brooklyn, NY 11238', 40.672352, -73.968226, 'America/New_York',
      'https://www.bklynlibrary.org/locations/central', 'https://www.bklynlibrary.org/use-the-library/wi-fi',
      'https://www.bklynlibrary.org/locations/closings', '+17182302100', null,
      'Bring your own laptop; Wi-Fi is available. The Info Commons has work areas. Loan and library-computer limits are separate from personal laptop use.',
      '2027-01-10',
      '{"Mon":[[540,1200]],"Tue":[[540,1200]],"Wed":[[540,1200]],"Thu":[[540,1200]],"Fri":[[540,1080]],"Sat":[[540,1080]],"Sun":[[780,1020]]}'::jsonb,
      '{"2026-11-26":[],"2026-11-27":[],"2026-12-24":[],"2026-12-25":[],"2026-12-31":[],"2027-01-01":[]}'::jsonb)
  ) AS pilot(city, country, slug, name, address, lat, lon, tz, hours, policy, holidays, phone, power, note, until_date, weekly, exceptions)
  LOOP
    IF EXISTS (SELECT FROM public.workspaces WHERE slug = item.slug) THEN CONTINUE; END IF;
    SELECT id INTO STRICT target_city FROM public.cities WHERE name = item.city AND country = item.country;
    IF EXISTS (SELECT FROM public.workspaces WHERE city_id = target_city AND (
      lower(name) = lower(item.name) OR lower(address) = lower(item.address) OR
      (abs(latitude - item.lat) < 0.00035 AND abs(longitude - item.lon) < 0.00035)
    )) THEN RAISE EXCEPTION 'Check possible duplicate: %', item.name; END IF;

    opening := jsonb_build_object('source',item.hours,'coverageSource',item.holidays,
      'exceptionsCheckedThrough',item.until_date,'weekly',item.weekly,'exceptions',item.exceptions);
    laptops := opening || jsonb_build_object('source',item.policy);
    IF NOT lumen_private.valid_session_policy(opening,(now() AT TIME ZONE item.tz)::date,false,true)
      OR NOT lumen_private.valid_session_policy(laptops,(now() AT TIME ZONE item.tz)::date,true,true)
    THEN RAISE EXCEPTION 'Invalid or out-of-date evidence: %', item.name; END IF;
    evidence := jsonb_build_object('timeZone',item.tz,'opening',opening,'laptopAccess',laptops,'note',item.note);

    INSERT INTO public.workspaces (city_id,slug,name,type,status,address,latitude,longitude,website,phone,
      description,laptop_friendly,has_wifi,has_power_outlets,time_limit_hours,last_verified_at)
    VALUES (target_city,item.slug,item.name,'library','approved',item.address,item.lat,item.lon,item.hours,item.phone,
      item.note,true,true,item.power,NULL,now()) RETURNING id INTO place_id;
    INSERT INTO public.workspace_session_hours (workspace_id,published,checked_at) VALUES (place_id,evidence,now());
  END LOOP;
END $$;

UPDATE public.workspace_session_hours h
SET draft = jsonb_set(h.draft,'{note}',to_jsonb(research.note)), revision = h.revision + 1
FROM public.workspaces w, (VALUES
  ('passionfruit-coffee-new-york', '2026-11-16: Official site confirms daily 08:00–17:00. Ask the venue about holiday hours, laptop restrictions, and stay limits.'),
  ('city-league-coffee-roasters-new-york', '2026-11-16: Confirmed regular hours at 6808 4th Avenue. Historical coworking references do not establish current laptop rules or holiday exceptions.'),
  ('new-york-public-library-stephen-a-schwarzman-building-new-york', '2026-11-16: NYPL confirms quiet study with personal devices in Dorot, room 111. Verify room-specific hours and holidays; do not substitute building hours.')
) AS research(slug,note)
WHERE h.workspace_id = w.id AND w.slug = research.slug AND h.published IS NULL AND h.draft->>'note' = '';

COMMIT;
