-- Read-only. Run after lumen-rollout.sql confirms work_fact_checks is true.
-- Counts eligible places for the default two-hour session. No accounts or prompts are returned.
WITH eligible AS (
  SELECT w.*,
    coalesce(f.checked_at BETWEEN now() - interval '180 days' AND now(), false)
      AND w.laptop_friendly IS TRUE
      AND (w.time_limit_hours = 0 OR w.time_limit_hours >= 2) AS ready
  FROM public.workspaces w
  LEFT JOIN public.workspace_work_fact_checks f ON f.workspace_id = w.id
  WHERE w.status = 'approved'
)
SELECT c.name, c.country, c.slug,
  count(*) AS approved_places,
  count(*) FILTER (WHERE w.ready) AS two_hour_matches,
  count(*) FILTER (WHERE w.ready AND w.has_wifi IS TRUE AND w.has_power_outlets IS TRUE) AS wifi_and_outlets,
  count(*) FILTER (WHERE w.ready AND w.noise_level = 'quiet') AS focus,
  count(*) FILTER (WHERE w.ready AND w.good_for_calls IS TRUE) AS calls
FROM eligible w
JOIN public.cities c ON c.id = w.city_id
GROUP BY c.id, c.name, c.country, c.slug
ORDER BY two_hour_matches DESC, approved_places DESC, c.slug;
