BEGIN;

-- Keep city IDs and slugs stable so existing place URLs continue to work.
UPDATE public.cities
SET country = 'Switzerland', country_code = 'CH'
WHERE (country, country_code) IS DISTINCT FROM ('Switzerland', 'CH')
  AND (
    upper(btrim(country_code)) = 'CH'
    OR lower(btrim(country)) ~ '^(switzerland|schweiz|suisse|svizzera|svizra)([[:space:]]*/[[:space:]]*(switzerland|schweiz|suisse|svizzera|svizra))*$'
  );

UPDATE public.workspaces
SET proposed_city_country = 'Switzerland'
WHERE proposed_city_country <> 'Switzerland'
  AND lower(btrim(proposed_city_country)) ~ '^(switzerland|schweiz|suisse|svizzera|svizra)([[:space:]]*/[[:space:]]*(switzerland|schweiz|suisse|svizzera|svizra))*$';

COMMIT;
