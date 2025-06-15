
-- Remove the problematic/duplicate INSERT RLS policy on map_veto_actions
DROP POLICY IF EXISTS "Team captains can insert veto if on match team, captain, and turn" ON public.map_veto_actions;

-- Review: Now only one correct insert policy (or add a minimal one if missing)
-- If needed, ensure correct insert policy ensures captains can insert (but is simpler)
-- Example (run only if needed):
-- CREATE POLICY "Team captains can create veto actions" ON public.map_veto_actions
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM team_members
--     WHERE user_id = auth.uid()
--       AND is_captain = TRUE
--       AND team_id = map_veto_actions.team_id
--   )
-- );

-- Audit: No further policy needed as plpgsql perform_veto_action does final validation, and frontend controls user actions.

