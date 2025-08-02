-- Simple targeted fix for veto system

-- 1. Fix the 3 veto functions to be SECURITY DEFINER
ALTER FUNCTION roll_veto_dice(uuid, uuid) SECURITY DEFINER;
ALTER FUNCTION perform_veto_ban(uuid, uuid, uuid) SECURITY DEFINER;
ALTER FUNCTION set_side_choice(uuid, uuid, text) SECURITY DEFINER;

-- 2. Update the RLS policy for map_veto_actions INSERT to allow all team members
DROP POLICY IF EXISTS "Team captains can create veto actions" ON map_veto_actions;

CREATE POLICY "Team members can create veto actions" 
ON map_veto_actions 
FOR INSERT 
WITH CHECK (
  -- Allow system/admin auto-picks (null team_id and performed_by)
  (team_id IS NULL AND performed_by IS NULL) 
  OR 
  -- Allow admins
  (get_user_role(auth.uid()) = 'admin'::user_role) 
  OR 
  -- Allow any team member (not just captains)
  (team_id IS NOT NULL AND is_user_on_team(auth.uid(), team_id))
);

-- 3. Ensure matches inherit correct veto settings from tournament
UPDATE matches 
SET map_veto_enabled = t.enable_map_veto 
FROM tournaments t 
WHERE matches.tournament_id = t.id 
AND matches.map_veto_enabled IS DISTINCT FROM t.enable_map_veto;