-- Reviewed one-off dataset. See docs/product/zurich-cafe-coworking-sources.md.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  city uuid;
  place_id uuid;
  item record;
  opening jsonb;
  laptops jsonb;
  coverage jsonb;
  holidays jsonb;
  office_exceptions jsonb;
  kraftwerk_exceptions jsonb;
  observed_at constant timestamptz := now();
  local_today constant date := (observed_at AT TIME ZONE 'Europe/Zurich')::date;
  office_faq constant text := 'https://buero-zueri.ch/faq';
  canton_holidays constant text := 'https://www.zh.ch/de/wirtschaft-arbeit/arbeitsbedingungen/arbeitsssicherheit-gesundheitsschutz/arbeits-ruhezeiten/feiertage.html';
  kraftwerk_cafe constant text := 'https://kraftwerk.zuerich/cafe-bar/';
BEGIN
  SELECT id INTO STRICT city FROM public.cities WHERE name = 'Zürich' AND country = 'Switzerland';
  holidays := '{"2026-12-25":[],"2026-12-26":[],"2027-01-01":[]}'::jsonb;
  -- No coworking-specific confirmation for Dec 24, Dec 31 or Jan 2. Leave these dates unknown.
  SELECT holidays || jsonb_object_agg(d::date, CASE WHEN extract(isodow FROM d) = 4
    THEN '[[540,1080]]'::jsonb ELSE '[[540,1020]]'::jsonb END)
    INTO office_exceptions
  FROM generate_series(timestamp '2026-11-19',timestamp '2026-12-19',interval '1 day') AS day(d)
  WHERE extract(isodow FROM d) IN (4,6);
  SELECT jsonb_object_agg(date '2026-12-21' + days.n,'[]'::jsonb) INTO kraftwerk_exceptions
  FROM generate_series(0,13) AS days(n);

  FOR item IN SELECT * FROM (VALUES
    ('buero-zueri-zurich','Büro Züri','coworking','Bahnhofstrasse 9, 8001 Zürich',47.36820602,8.53958607,
      '+41442923000','https://buero-zueri.ch/spaces','Free coworking with Wi-Fi. Reserve a desk; no bank account needed.',
      'Free desks for up to one day by reservation. Bring your own laptop; guest Wi-Fi requires a mobile number. Mon–Fri 09:00–18:00; Sat 09:00–17:00. Closed Sundays and public holidays.',
      office_faq,'https://buero-zueri.ch/allgemeine-nutzungsbedingungen',canton_holidays,
      '{"Mon":[[540,1080]],"Tue":[[540,1080]],"Wed":[[540,1080]],"Fri":[[540,1080]],"Sun":[]}'::jsonb,
      office_exceptions,true,true,
      'Reserve a free desk online; availability is separate. Bring your own laptop. Guest Wi-Fi requires a mobile number; no bank account is needed.'),
    ('kraftwerk-cafe-zurich','Kraftwerk Café & Bar','cafe','Selnaustrasse 25, 8001 Zürich',47.37230682,8.53218651,
      '+41798170703',kraftwerk_cafe,'Café in the former Selnau power station. The operator welcomes work on its terrace.',
      'Café in the former Selnau power station. The operator welcomes work on the terrace; indoor laptop rules and stay limits are not confirmed. Café hours: Mon–Tue 08:00–20:00, Wed 08:00–22:00, Thu–Fri 08:00–00:00. Closed weekends and 21 December 2026 through 3 January 2027. Private events can affect access.',
      kraftwerk_cafe,'https://kraftwerk.zuerich/about/',kraftwerk_cafe || '#feiertage',
      '{"Mon":[[480,1200]],"Tue":[[480,1200]],"Wed":[[480,1320]],"Thu":[[480,1440]],"Fri":[[480,1440]],"Sat":[],"Sun":[]}'::jsonb,
      kraftwerk_exceptions,NULL::boolean,NULL::boolean,
      'The operator welcomes outdoor work on the terrace. Indoor laptop access and stay limits are not confirmed.')
  ) AS data(slug,name,kind,address,lat,lon,phone,site,summary,description,hours_source,policy_source,coverage_source,
    weekly,exceptions,laptop_friendly,wifi,note)
  LOOP
    IF EXISTS (SELECT FROM public.workspaces WHERE slug = item.slug) THEN CONTINUE; END IF;
    IF EXISTS (SELECT FROM public.workspaces WHERE city_id = city AND (
      lower(name) = lower(item.name) OR lower(address) = lower(item.address) OR
      (abs(latitude - item.lat) < 0.00035 AND abs(longitude - item.lon) < 0.00035)
    )) THEN RAISE EXCEPTION 'Check possible duplicate: %', item.name; END IF;

    coverage := jsonb_build_object('coverageSource',item.coverage_source,
      'exceptionsCheckedThrough','2027-01-03','exceptions',item.exceptions);
    opening := coverage || jsonb_build_object('source',item.hours_source,'weekly',item.weekly);
    laptops := CASE WHEN item.laptop_friendly IS TRUE
      THEN coverage || jsonb_build_object('source',item.policy_source,'weekly',item.weekly,'maxSessionMinutes',540)
      -- Only verified closures can rule out a laptop visit at the café; normal access stays unknown.
      ELSE coverage || jsonb_build_object('source',item.policy_source,'weekly','{}'::jsonb) END;
    IF NOT lumen_private.valid_session_policy(opening,local_today,false,true)
      OR NOT lumen_private.valid_session_policy(laptops,local_today,true,true)
    THEN RAISE EXCEPTION 'Invalid or out-of-date evidence: %', item.name; END IF;
    INSERT INTO public.workspaces (city_id,slug,name,type,status,address,latitude,longitude,website,phone,
      description,short_description,laptop_friendly,has_wifi,last_verified_at)
    VALUES (city,item.slug,item.name,item.kind::public.workspace_type,'approved',item.address,item.lat,item.lon,item.site,item.phone,
      item.description,item.summary,item.laptop_friendly,item.wifi,observed_at) RETURNING id INTO place_id;
    IF item.laptop_friendly IS TRUE THEN
      INSERT INTO public.workspace_work_fact_checks (workspace_id,checked_at) VALUES (place_id,observed_at);
    END IF;
    INSERT INTO public.workspace_session_hours (workspace_id,published,checked_at)
    VALUES (place_id,jsonb_build_object('timeZone','Europe/Zurich','opening',opening,'laptopAccess',laptops,'note',item.note),observed_at);
  END LOOP;
END $$;
COMMIT;
