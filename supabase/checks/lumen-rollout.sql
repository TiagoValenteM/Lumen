-- Read-only checks. Run separately in the verified staging and production projects.
-- A false result indicates an absent or incompatible object, not a migration to replay blindly.
WITH objects AS (
  SELECT
    to_regclass('public.profiles') AS profiles,
    to_regclass('public.workspaces') AS workspaces,
    to_regclass('public.workspace_photos') AS photos,
    to_regclass('public.workspace_edit_suggestions') AS edit_suggestions,
    to_regclass('public.workspace_ai_enrichments') AS enrichment,
    to_regclass('lumen_private.admin_roles') AS admin_roles,
    to_regclass('public.workspace_work_fact_checks') AS work_checks,
    to_regprocedure('public.auto_set_first_photo_primary()') AS first_photo,
    to_regprocedure('public.update_city_workspace_count()') AS city_count,
    to_regprocedure('public.save_workspace_ai_review(uuid,uuid,jsonb,text[])') AS atomic_review,
    to_regprocedure('public.take_geocoding_slot(uuid,text)') AS geocode_quota,
    to_regprocedure('public.submit_workspace_with_photos(uuid,text,text,jsonb,text[])') AS submit_place,
    to_regprocedure('public.check_workspace_work_facts(uuid,jsonb)') AS check_facts,
    to_regprocedure('public.take_spot_interpretation_slot(uuid)') AS spot_quota
)
SELECT
  profiles IS NOT NULL AND workspaces IS NOT NULL AND photos IS NOT NULL
    AND edit_suggestions IS NOT NULL AND enrichment IS NOT NULL AS baseline_tables,
  first_photo IS NOT NULL AND city_count IS NOT NULL AS legacy_trigger_functions,
  admin_roles IS NOT NULL AS private_admin_roles,
  atomic_review IS NOT NULL AS atomic_review,
  geocode_quota IS NOT NULL AS geocode_quota,
  submit_place IS NOT NULL AS first_place_submission,
  work_checks IS NOT NULL AND check_facts IS NOT NULL AS work_fact_checks,
  spot_quota IS NOT NULL AS spot_ai_quota,
  coalesce(
    has_function_privilege('service_role', geocode_quota::oid, 'EXECUTE')
    AND NOT has_function_privilege('authenticated', geocode_quota::oid, 'EXECUTE')
    AND NOT has_function_privilege('anon', geocode_quota::oid, 'EXECUTE'), false
  ) AS geocode_quota_service_only,
  coalesce(
    has_function_privilege('service_role', spot_quota::oid, 'EXECUTE')
    AND NOT has_function_privilege('authenticated', spot_quota::oid, 'EXECUTE')
    AND NOT has_function_privilege('anon', spot_quota::oid, 'EXECUTE'), false
  ) AS spot_ai_quota_service_only,
  coalesce(
    has_column_privilege('anon', work_checks::oid, 'checked_at', 'SELECT')
    AND NOT has_column_privilege('anon', work_checks::oid, 'checked_by', 'SELECT')
    AND NOT has_column_privilege('authenticated', work_checks::oid, 'checked_by', 'SELECT'), false
  ) AS public_check_keeps_moderator_private
FROM objects;
