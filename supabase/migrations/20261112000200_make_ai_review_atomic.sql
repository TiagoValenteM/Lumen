BEGIN;

-- Legacy in-flight jobs cannot be resumed by the new worker.
UPDATE public.workspace_ai_enrichments
SET status = 'failed', error_message = 'This run was interrupted. Run AI again to retry.'
WHERE status IN ('queued', 'researching', 'extracting', 'pending');

-- Older clients recorded applied decisions before saving. Keep them only on
-- runs whose save completed and moved the run to its terminal state.
UPDATE public.workspace_ai_enrichments AS run
SET field_decisions = (
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM jsonb_each_text(run.field_decisions) WHERE value IS DISTINCT FROM 'applied'
)
WHERE status IN ('ready_for_review', 'completed')
  AND jsonb_typeof(field_decisions) = 'object'
  AND field_decisions @? '$.* ? (@ == "applied")';

CREATE UNIQUE INDEX workspace_ai_one_active_run
ON public.workspace_ai_enrichments (workspace_id)
WHERE status IN ('queued', 'researching', 'extracting', 'pending');

CREATE FUNCTION public.expire_workspace_ai_runs(workspace_uuid uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$
  UPDATE public.workspace_ai_enrichments
  SET status = 'failed', error_message = 'AI research timed out. Run again to retry.'
  WHERE workspace_id = workspace_uuid
    AND status IN ('queued', 'researching', 'extracting', 'pending')
    AND coalesce(updated_at, created_at) < now() - interval '3 minutes';
$$;
REVOKE EXECUTE ON FUNCTION public.expire_workspace_ai_runs(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_workspace_ai_runs(uuid) TO service_role;

CREATE FUNCTION public.enqueue_workspace_ai_run(
  workspace_uuid uuid, requester uuid, rerun boolean, chosen_model text, chosen_mode text, snapshot jsonb
) RETURNS TABLE (run_id uuid, run_status text, started boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  target public.workspaces;
  existing public.workspace_ai_enrichments;
  moderator boolean;
BEGIN
  SELECT * INTO target FROM public.workspaces WHERE id = workspace_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace not found' USING ERRCODE = 'P0002'; END IF;
  SELECT EXISTS (SELECT 1 FROM lumen_private.admin_roles WHERE user_id = requester) INTO moderator;
  IF NOT moderator AND (
    rerun OR target.submitted_by IS DISTINCT FROM requester OR target.status IS DISTINCT FROM 'pending'
  ) THEN
    RAISE EXCEPTION 'Not permitted to run AI for this workspace' USING ERRCODE = '42501';
  END IF;

  PERFORM public.expire_workspace_ai_runs(workspace_uuid);
  SELECT * INTO existing FROM public.workspace_ai_enrichments
  WHERE workspace_id = workspace_uuid
    AND (NOT rerun OR status IN ('queued', 'researching', 'extracting', 'pending'))
  ORDER BY created_at DESC, id DESC LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT existing.id, existing.status, false;
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.workspace_ai_enrichments
    (workspace_id, requested_by, status, model, run_mode, input_snapshot, run_metadata)
  VALUES (workspace_uuid, requester, 'queued', chosen_model, chosen_mode, snapshot,
    jsonb_build_object('requested_mode', chosen_mode, 'queued_at', now()))
  RETURNING id, status, true;
END;
$$;
GRANT USAGE ON SCHEMA lumen_private TO service_role;
GRANT SELECT ON lumen_private.admin_roles TO service_role;
REVOKE EXECUTE ON FUNCTION public.enqueue_workspace_ai_run(uuid, uuid, boolean, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_workspace_ai_run(uuid, uuid, boolean, text, text, jsonb) TO service_role;

CREATE FUNCTION lumen_private.validate_ai_decision_paths(suggestions jsonb, decisions jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT CASE WHEN jsonb_typeof(decisions) = 'object' THEN NOT EXISTS (
    SELECT 1 FROM jsonb_object_keys(decisions) AS key(path)
    WHERE path !~ '^(description|short_description|website|phone|opening_hours_note|core_details\.[a-z_]+|work_details\.[a-z_]+|work_notes\.[0-9]+|review_insights\.(summary|remote_work_signal))$'
      OR coalesce(suggestions #> string_to_array(path, '.'), 'null'::jsonb) IN ('null'::jsonb, '""'::jsonb)
  ) ELSE false END;
$$;

CREATE FUNCTION public.review_workspace_ai_run(
  workspace_uuid uuid, enrichment_uuid uuid, decisions jsonb, dismiss boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE run public.workspace_ai_enrichments;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO run FROM public.workspace_ai_enrichments
  WHERE id = enrichment_uuid AND workspace_id = workspace_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI run not found' USING ERRCODE = 'P0002'; END IF;
  IF run.status NOT IN ('ready_for_review', 'completed') THEN
    RAISE EXCEPTION 'This AI run is no longer available for review' USING ERRCODE = '22023';
  END IF;
  IF NOT lumen_private.validate_ai_decision_paths(run.suggested_fields, decisions)
    OR EXISTS (SELECT 1 FROM jsonb_each_text(decisions) WHERE value IS DISTINCT FROM 'rejected') THEN
    RAISE EXCEPTION 'Invalid AI review decisions' USING ERRCODE = '22023';
  END IF;
  UPDATE public.workspace_ai_enrichments
  SET field_decisions = field_decisions || decisions,
      status = CASE WHEN dismiss THEN 'dismissed' ELSE status END,
      run_metadata = run_metadata || jsonb_build_object('last_review_action_at', now(), 'last_review_action_by', auth.uid())
  WHERE id = enrichment_uuid;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_workspace_ai_run(uuid, uuid, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_workspace_ai_run(uuid, uuid, jsonb, boolean) TO authenticated;

CREATE FUNCTION public.save_workspace_ai_review(
  workspace_uuid uuid, enrichment_uuid uuid, patch jsonb, applied_paths text[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  run public.workspace_ai_enrichments;
  assignments text;
  decisions jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501'; END IF;
  -- Match enqueue's lock order.
  PERFORM 1 FROM public.workspaces WHERE id = workspace_uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO run FROM public.workspace_ai_enrichments
  WHERE id = enrichment_uuid AND workspace_id = workspace_uuid FOR UPDATE;
  IF NOT FOUND OR run.status NOT IN ('ready_for_review', 'completed') THEN
    RAISE EXCEPTION 'This AI run is no longer available. Reload the review before saving.' USING ERRCODE = '22023';
  END IF;
  IF coalesce(cardinality(applied_paths), 0) NOT BETWEEN 1 AND 100 OR array_position(applied_paths, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Choose at least one valid AI suggestion' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_object_agg(path, 'applied'::text) INTO decisions FROM unnest(applied_paths) AS paths(path);
  IF NOT lumen_private.validate_ai_decision_paths(run.suggested_fields, decisions)
    OR EXISTS (SELECT 1 FROM unnest(applied_paths) AS paths(path) WHERE run.field_decisions ->> path = 'rejected') THEN
    RAISE EXCEPTION 'One or more AI suggestions are no longer available' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(patch) IS DISTINCT FROM 'object' OR patch = '{}'::jsonb OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(patch) AS key(col) WHERE col NOT IN (
      'name', 'type', 'short_description', 'description', 'address', 'website', 'phone', 'city_id',
      'latitude', 'longitude', 'status', 'has_wifi', 'wifi_speed', 'has_power_outlets',
      'power_outlet_availability', 'seating_capacity', 'seating_comfort', 'has_outdoor_seating',
      'has_standing_desks', 'noise_level', 'music_volume', 'has_natural_light', 'has_air_conditioning',
      'has_heating', 'has_restrooms', 'has_parking', 'has_bike_parking', 'is_accessible', 'allows_pets',
      'has_food', 'has_veg', 'has_coffee', 'has_alcohol', 'price_range', 'laptop_friendly',
      'time_limit_hours', 'minimum_purchase_required', 'good_for_meetings', 'good_for_calls',
      'good_for_groups', 'location_source', 'location_provider', 'location_provider_id',
      'location_confidence', 'location_raw', 'rejection_reason', 'admin_notes', 'last_verified_at',
      'verified_by'
    )
  ) THEN
    RAISE EXCEPTION 'Invalid workspace update' USING ERRCODE = '22023';
  END IF;
  SELECT string_agg(format('%1$I = incoming.%1$I', col), ', ' ORDER BY col)
  INTO assignments FROM jsonb_object_keys(patch) AS key(col);
  EXECUTE 'UPDATE public.workspaces AS w SET ' || assignments ||
    ' FROM jsonb_populate_record(NULL::public.workspaces, $1) AS incoming WHERE w.id = $2'
    USING patch, workspace_uuid;

  UPDATE public.workspace_ai_enrichments
  SET field_decisions = field_decisions || decisions, status = 'applied',
      run_metadata = run_metadata || jsonb_build_object('applied_at', now(), 'applied_by', auth.uid())
  WHERE id = enrichment_uuid;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.save_workspace_ai_review(uuid, uuid, jsonb, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_workspace_ai_review(uuid, uuid, jsonb, text[]) TO authenticated;

COMMIT;
