BEGIN;

CREATE SCHEMA IF NOT EXISTS lumen_private;
REVOKE ALL ON SCHEMA lumen_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS lumen_private.admin_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
REVOKE ALL ON lumen_private.admin_roles FROM PUBLIC, anon, authenticated;

-- Verify the legacy admin list against known operator accounts before rollout.
INSERT INTO lumen_private.admin_roles (user_id)
SELECT id FROM public.profiles WHERE is_admin IS TRUE
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lumen_private.admin_roles WHERE user_id = (SELECT auth.uid())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Some older deployments already have permissive profile policies. Restrict
-- the writable columns independently of which ownership policy is installed.
REVOKE INSERT, UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT (is_admin, is_ambassador, email), UPDATE (is_admin, is_ambassador, email)
ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, first_name, last_name, tag, avatar_url, bio),
      UPDATE (id, first_name, last_name, tag, avatar_url, bio)
ON public.profiles TO authenticated;

-- Email belongs to Auth. Keep the old column empty so older read queries work.
UPDATE public.profiles SET email = NULL WHERE email IS NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_is_private CHECK (email IS NULL);

CREATE TABLE lumen_private.workspace_notes (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  notes text NOT NULL
);
REVOKE ALL ON lumen_private.workspace_notes FROM PUBLIC, anon, authenticated;
INSERT INTO lumen_private.workspace_notes (workspace_id, notes)
SELECT id, admin_notes FROM public.workspaces WHERE admin_notes IS NOT NULL;
UPDATE public.workspaces SET admin_notes = NULL WHERE admin_notes IS NOT NULL;
ALTER TABLE public.workspaces ADD CONSTRAINT workspace_notes_are_private CHECK (admin_notes IS NULL);

CREATE FUNCTION lumen_private.store_workspace_notes()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.is_admin() THEN
    IF NEW.admin_notes IS NULL THEN
      DELETE FROM lumen_private.workspace_notes WHERE workspace_id = NEW.id;
    ELSE
      INSERT INTO lumen_private.workspace_notes (workspace_id, notes)
      VALUES (NEW.id, NEW.admin_notes)
      ON CONFLICT (workspace_id) DO UPDATE SET notes = EXCLUDED.notes;
    END IF;
  END IF;
  NEW.admin_notes := NULL;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION lumen_private.store_workspace_notes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER store_workspace_notes
BEFORE UPDATE OF admin_notes ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION lumen_private.store_workspace_notes();

CREATE FUNCTION public.get_workspace_admin_notes(workspace_uuid uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT notes FROM lumen_private.workspace_notes
  WHERE workspace_id = workspace_uuid AND (SELECT public.is_admin());
$$;
REVOKE EXECUTE ON FUNCTION public.get_workspace_admin_notes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_admin_notes(uuid) TO authenticated;

-- Keep historic edit-suggestion notes for operators, but not in the Data API.
REVOKE SELECT ON public.workspace_edit_suggestions FROM PUBLIC, anon, authenticated;
REVOKE SELECT (admin_notes) ON public.workspace_edit_suggestions FROM PUBLIC, anon, authenticated;
DO $$
DECLARE readable_columns text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO readable_columns
  FROM pg_attribute
  WHERE attrelid = 'public.workspace_edit_suggestions'::regclass
    AND attnum > 0 AND NOT attisdropped AND attname <> 'admin_notes';
  EXECUTE format('GRANT SELECT (%s) ON public.workspace_edit_suggestions TO authenticated', readable_columns);
END;
$$;
CREATE POLICY "Members cannot insert internal edit suggestion notes"
ON public.workspace_edit_suggestions AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (admin_notes IS NULL);

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON public.workspace_photos;
CREATE POLICY "Authenticated users can upload unapproved photos"
ON public.workspace_photos FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Only moderators can insert approved photos"
ON public.workspace_photos AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  (is_approved IS FALSE AND approved_by IS NULL AND reviewed_by IS NULL
    AND reviewed_at IS NULL AND rejection_reason IS NULL
    AND EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE id = workspace_id AND submitted_by = (SELECT auth.uid()) AND status = 'pending'
    ))
  OR (SELECT public.is_admin())
);
CREATE POLICY "Only moderators can update photo moderation"
ON public.workspace_photos AS RESTRICTIVE FOR UPDATE TO authenticated
USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Submitters can view enrichment for their workspaces" ON public.workspace_ai_enrichments;
DROP POLICY IF EXISTS "Submitters can create enrichment for their pending workspaces" ON public.workspace_ai_enrichments;
DROP POLICY IF EXISTS "Submitters can update enrichment for their pending workspaces" ON public.workspace_ai_enrichments;
DROP POLICY IF EXISTS "Admins can manage all workspace enrichment" ON public.workspace_ai_enrichments;
CREATE POLICY "Admins can read workspace enrichment"
ON public.workspace_ai_enrichments FOR SELECT TO authenticated
USING ((SELECT public.is_admin()));
REVOKE ALL ON public.workspace_ai_enrichments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.workspace_ai_enrichments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workspace_ai_enrichments TO service_role;

COMMIT;
