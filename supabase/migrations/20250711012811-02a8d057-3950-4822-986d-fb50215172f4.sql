-- Fix RLS policy to allow auto-pick insertions with NULL team_id
DROP POLICY IF EXISTS "Team captains can create veto actions" ON public.map_veto_actions;

-- Create updated policy that allows auto-picks (NULL team_id) and team captain actions
CREATE POLICY "Team captains can create veto actions" ON public.map_veto_actions
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow auto-picks with NULL team_id (system generated)
  (team_id IS NULL AND performed_by IS NULL)
  OR
  -- Allow admin users
  (get_user_role(auth.uid()) = 'admin'::user_role)
  OR
  -- Allow team captains for their teams
  (team_id IS NOT NULL AND is_team_captain(auth.uid(), team_id))
);