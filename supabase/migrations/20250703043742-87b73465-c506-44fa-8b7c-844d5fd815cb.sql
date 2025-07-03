-- Fix is_user_on_team function to work with tournament teams (teams table)
-- Instead of checking team_members table, check if user is captain of the team
CREATE OR REPLACE FUNCTION public.is_user_on_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id
      AND captain_id = p_user_id
  );
$$;