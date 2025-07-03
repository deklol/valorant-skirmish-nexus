-- Fix is_user_on_team function to only check team_members table for tournament teams
-- This function is used by the veto system to check if a user is a captain
CREATE OR REPLACE FUNCTION public.is_user_on_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    -- Check if user is captain in team_members table (tournament system)
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND is_captain = true
  );
$$;