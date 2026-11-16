BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.workspace_edit_suggestions ADD COLUMN visit_observation jsonb;
CREATE INDEX workspace_visit_observation_members ON public.workspace_edit_suggestions(user_id, created_at)
  WHERE visit_observation IS NOT NULL;
CREATE INDEX workspace_session_review_reports ON public.workspace_edit_suggestions(workspace_id)
  WHERE status IN ('open','reviewing') AND (visit_observation IS NOT NULL OR kind = 'closed_place');

CREATE FUNCTION public.submit_workspace_visit_observation(
  workspace_uuid uuid, visited_on date, doors text, laptops text, stay text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid(); report jsonb; today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in to report a visit.' USING ERRCODE = '42501'; END IF;
  IF visited_on IS NULL OR visited_on NOT BETWEEN today - 31 AND today + 1
    OR coalesce(doors,'') NOT IN ('unknown','open','closed')
    OR coalesce(laptops,'') NOT IN ('unknown','allowed','restricted','not_allowed')
    OR coalesce(stay,'') NOT IN ('unknown','no_limit_seen','limit_seen')
    OR (doors = 'unknown' AND laptops = 'unknown' AND stay = 'unknown')
    OR (doors = 'closed' AND (laptops <> 'unknown' OR stay <> 'unknown'))
  THEN RAISE EXCEPTION 'Enter a recent visit and at least one observation.' USING ERRCODE = '22023'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('workspace-visit:' || actor::text, 0));
  PERFORM 1 FROM public.workspaces WHERE id = workspace_uuid AND status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This place is not published.' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT FROM public.workspace_edit_suggestions s WHERE s.user_id = actor
    AND s.workspace_id = workspace_uuid AND s.visit_observation->>'date' = visited_on::text)
  THEN RAISE EXCEPTION 'You already reported this visit.' USING ERRCODE = '23505'; END IF;
  IF (SELECT count(*) FROM public.workspace_edit_suggestions s WHERE s.user_id = actor
    AND s.visit_observation IS NOT NULL AND s.created_at >= now() - interval '24 hours') >= 10
  THEN RAISE EXCEPTION 'Daily visit-report limit reached.' USING ERRCODE = '22023'; END IF;

  report := public.submit_workspace_edit_suggestion(workspace_uuid, 'other', format(
    'Visit observation (%s). Doors: %s. Laptops: %s. Stay: %s.',
    visited_on, doors, replace(laptops, '_', ' '), replace(stay, '_', ' ')));
  UPDATE public.workspace_edit_suggestions SET visit_observation =
    jsonb_build_object('date', visited_on, 'doors', doors, 'laptops', laptops, 'stay', stay)
  WHERE id = (report->>'suggestion_id')::uuid;
  RETURN (report->>'suggestion_id')::uuid;
END;
$$;

CREATE FUNCTION public.list_workspace_session_review()
RETURNS TABLE (
  workspace_id uuid, name text, city text, status text, reason text, checked_at timestamptz,
  coverage_through date, visit_reports integer, closure_reports integer, has_draft boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Moderator access required.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH reports AS (
    SELECT s.workspace_id,
      count(*) FILTER (WHERE s.visit_observation IS NOT NULL)::integer AS visits,
      count(*) FILTER (WHERE s.kind = 'closed_place')::integer AS closures
    FROM public.workspace_edit_suggestions s WHERE s.status IN ('open','reviewing')
      AND (s.visit_observation IS NOT NULL OR s.kind = 'closed_place')
    GROUP BY s.workspace_id
  ), candidates AS (
    SELECT w.id, w.name::text AS place_name, c.name::text AS city_name, w.status::text AS place_status,
      h.checked_at AS checked, h.draft IS NOT NULL AS draft,
      least(h.published->'opening'->>'exceptionsCheckedThrough',h.published->'laptopAccess'->>'exceptionsCheckedThrough')::date AS through_date,
      coalesce((now() AT TIME ZONE (h.published->>'timeZone'))::date,(now() AT TIME ZONE 'UTC')::date) AS today,
      coalesce(r.visits,0) AS visits, coalesce(r.closures,0) AS closures
    FROM public.workspaces w LEFT JOIN public.cities c ON c.id = w.city_id
    LEFT JOIN public.workspace_session_hours h ON h.workspace_id = w.id
    LEFT JOIN reports r ON r.workspace_id = w.id
    WHERE w.status = 'approved' OR r.workspace_id IS NOT NULL OR h.draft IS NOT NULL
  ), ranked AS (
    SELECT *, CASE
      WHEN closures > 0 THEN 'closure_report'
      WHEN visits > 0 THEN 'visit_report'
      WHEN checked < now() - interval '720 hours' OR through_date < today THEN 'expired'
      WHEN checked < now() - interval '384 hours' OR through_date <= today + 14 THEN 'due_soon'
      WHEN checked IS NULL AND draft THEN 'draft'
      WHEN checked IS NULL THEN 'unchecked'
      ELSE 'current'
    END AS category FROM candidates
  )
  SELECT id, place_name, city_name, place_status, category, checked, through_date, visits, closures, draft
  FROM ranked WHERE category <> 'current'
  ORDER BY CASE category WHEN 'closure_report' THEN 1 WHEN 'visit_report' THEN 2 WHEN 'expired' THEN 3
    WHEN 'due_soon' THEN 4 WHEN 'draft' THEN 5 ELSE 6 END, through_date NULLS LAST, place_name, id
  LIMIT 250;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_workspace_visit_observation(uuid,date,text,text,text),
  public.list_workspace_session_review() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_workspace_visit_observation(uuid,date,text,text,text),
  public.list_workspace_session_review() TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
