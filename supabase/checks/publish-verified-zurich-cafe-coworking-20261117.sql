-- Reviewed one-off dataset. See docs/product/zurich-cafe-coworking-sources.md.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  zurich_id uuid;
  place_id uuid;
  venue record;
  opening jsonb;
  laptops jsonb;
  schedule jsonb;
  closures jsonb;
  observed_at constant timestamptz := now();
  local_today constant date := (observed_at AT TIME ZONE 'Europe/Zurich')::date;
  day_pass constant text := 'https://www.westhive.com/en/coworking/day-pass/';
  calendar constant text := 'https://www.westhive.com/en/special-opening-hours/';
BEGIN
  SELECT id INTO STRICT zurich_id FROM public.cities WHERE name = 'Zürich' AND country = 'Switzerland';
  SELECT jsonb_object_agg(date '2026-12-24' + day_offset, '[]'::jsonb)
  INTO closures FROM generate_series(0, 10) AS days(day_offset);
  FOR venue IN SELECT * FROM (VALUES
    ('cafe-du-bonheur-zurich', 'Café du Bonheur', 'cafe', 'Zypressenstrasse 115, 8004 Zürich',
      47.37990570, 8.51630116, '+41445589900', 'https://cafedubonheur.ch/', NULL::boolean,
      'Neighbourhood café on Bullingerplatz. Zürich Tourism lists it as a place to work on a laptop. Regular hours: Mon–Fri 08:00–23:00; Sat–Sun 10:00–18:00. Check holiday hours and any laptop restrictions before visiting.'),
    ('westhive-hardturm-zurich', 'Westhive Zürich Hardturm', 'coworking', 'Hardturmstrasse 161, 8005 Zürich',
      47.39333725, 8.51187897, '+41434446800', 'https://www.westhive.com/en/locations/zurich-hardturm/', true,
      'Open-plan desks with Wi-Fi in Zürich-West. Book a paid day pass online. Visitor hours are Mon–Fri 07:30–20:00; member access is separate.'),
    ('westhive-paradeplatz-zurich', 'Westhive Zürich Paradeplatz', 'coworking', 'Bahnhofstrasse 22, 8001 Zürich',
      47.36920929, 8.53977013, '+41434446800', 'https://www.westhive.com/en/locations/zurich-paradeplatz/', true,
      'Open-plan desks with Wi-Fi near Paradeplatz. Book a paid day pass online. Visitor hours are Mon–Fri 07:30–20:00; member access is separate.')
  ) AS evidence(slug,name,kind,address,lat,lon,phone,site,wifi,description)
  LOOP
    IF EXISTS (SELECT FROM public.workspaces WHERE slug = venue.slug) THEN CONTINUE; END IF;
    IF EXISTS (SELECT FROM public.workspaces WHERE city_id = zurich_id AND (
      lower(name) = lower(venue.name) OR lower(address) = lower(venue.address) OR
      (abs(latitude - venue.lat) < 0.00035 AND abs(longitude - venue.lon) < 0.00035)
    )) THEN RAISE EXCEPTION 'Check possible duplicate: %', venue.name; END IF;

    INSERT INTO public.workspaces (city_id,slug,name,type,status,address,latitude,longitude,website,phone,
      description,short_description,laptop_friendly,has_wifi,last_verified_at)
    VALUES (zurich_id,venue.slug,venue.name,venue.kind::public.workspace_type,'approved',venue.address,venue.lat,venue.lon,venue.site,venue.phone,
      venue.description, CASE WHEN venue.kind = 'cafe' THEN 'Neighbourhood café on Bullingerplatz with a terrace.'
        ELSE 'Coworking desks with Wi-Fi. Book a paid day pass online.' END, true,venue.wifi,observed_at)
    RETURNING id INTO place_id;
    INSERT INTO public.workspace_work_fact_checks (workspace_id,checked_at) VALUES (place_id,observed_at);

    IF venue.kind = 'cafe' THEN
      opening := jsonb_build_object('source',venue.site,'coverageSource','','exceptionsCheckedThrough','',
        'weekly','{"Mon":[[480,1380]],"Tue":[[480,1380]],"Wed":[[480,1380]],"Thu":[[480,1380]],"Fri":[[480,1380]],"Sat":[[600,1080]],"Sun":[[600,1080]]}'::jsonb,'exceptions','{}'::jsonb);
      laptops := jsonb_build_object('source','https://www.zuerich.com/en/visit/restaurants/cafe-du-bonheur',
        'coverageSource','','exceptionsCheckedThrough','','weekly','{}'::jsonb,'exceptions','{}'::jsonb);
      schedule := jsonb_build_object('timeZone','Europe/Zurich','opening',opening,'laptopAccess',laptops,
        'note','Operator lists Saturday closing at 18:00. Tourism lists laptop use, but holiday exceptions, laptop windows, and stay limits still need direct confirmation.');
      IF NOT lumen_private.valid_session_policy(opening,NULL,false,false)
        OR NOT lumen_private.valid_session_policy(laptops,NULL,true,false)
      THEN RAISE EXCEPTION 'Invalid café draft'; END IF;
      INSERT INTO public.workspace_session_hours (workspace_id,draft) VALUES (place_id,schedule);
      INSERT INTO public.workspace_photos (workspace_id,url,caption,is_primary,is_approved)
      VALUES (place_id,'/images/zurich-bullingerplatz-roland-fischer.jpg',
        'Café du Bonheur’s terrace across Bullingerplatz, photographed in 2018.',true,true);
    ELSE
      opening := jsonb_build_object('source',day_pass,'coverageSource',calendar,'exceptionsCheckedThrough','2027-01-03',
        'weekly','{"Mon":[[450,1200]],"Tue":[[450,1200]],"Wed":[[450,1200]],"Thu":[[450,1200]],"Fri":[[450,1200]],"Sat":[],"Sun":[]}'::jsonb,'exceptions',closures);
      laptops := opening || jsonb_build_object('maxSessionMinutes',750);
      IF NOT lumen_private.valid_session_policy(opening,local_today,false,true)
        OR NOT lumen_private.valid_session_policy(laptops,local_today,true,true)
      THEN RAISE EXCEPTION 'Invalid or out-of-date evidence: %', venue.name; END IF;
      schedule := jsonb_build_object('timeZone','Europe/Zurich','opening',opening,'laptopAccess',laptops,
        'note','Book a paid day pass online. Hours are for day-pass visitors, not members. A desk is subject to availability.');
      INSERT INTO public.workspace_session_hours (workspace_id,published,checked_at) VALUES (place_id,schedule,observed_at);
      IF venue.slug = 'westhive-hardturm-zurich' THEN
        INSERT INTO public.workspace_photos (workspace_id,url,caption,is_primary,is_approved)
        VALUES (place_id,'/images/zurich-hardturmstrasse-161-tschubby.jpg',
          'Street entrance to Hardturmstrasse 161, photographed in 2020.',true,true);
      END IF;
    END IF;
  END LOOP;
END $$;
COMMIT;
