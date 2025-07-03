-- Update is_user_on_team function to use hybrid approach
-- Check both teams.captain_id (new system) AND team_members.is_captain (old system)
CREATE OR REPLACE FUNCTION public.is_user_on_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    -- Check if user is captain in teams table (new persistent team system)
    SELECT 1 FROM teams
    WHERE id = p_team_id
      AND captain_id = p_user_id
  ) OR EXISTS (
    -- Check if user is captain in team_members table (old tournament system)
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND is_captain = true
  );
$$;