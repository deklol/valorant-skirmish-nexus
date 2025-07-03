-- Add team-specific statistics columns to persistent_teams table
ALTER TABLE persistent_teams 
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tournaments_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tournaments_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rank_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rank_points INTEGER DEFAULT 0;

-- Add comment explaining the distinction
COMMENT ON TABLE persistent_teams IS 'Persistent teams with their own separate statistics tracking, independent from individual user stats';

-- Create functions to update team statistics (similar to user stat functions)
CREATE OR REPLACE FUNCTION public.increment_team_wins(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE persistent_teams 
  SET wins = COALESCE(wins, 0) + 1
  WHERE id = p_team_id;
  
  -- Log the update for debugging
  RAISE LOG 'Incremented wins for team %', p_team_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_team_losses(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE persistent_teams 
  SET losses = COALESCE(losses, 0) + 1
  WHERE id = p_team_id;
  
  -- Log the update for debugging
  RAISE LOG 'Incremented losses for team %', p_team_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_team_tournament_wins(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE persistent_teams 
  SET tournaments_won = COALESCE(tournaments_won, 0) + 1
  WHERE id = p_team_id;
  
  -- Log the update for debugging
  RAISE LOG 'Incremented tournament wins for team %', p_team_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_team_tournaments_played(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE persistent_teams 
  SET tournaments_played = COALESCE(tournaments_played, 0) + 1
  WHERE id = p_team_id;
  
  -- Log the update for debugging
  RAISE LOG 'Incremented tournaments played for team %', p_team_id;
END;
$function$;

-- Function to update team's average rank points based on current members
CREATE OR REPLACE FUNCTION public.update_team_avg_rank_points(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  avg_points INTEGER;
  total_points INTEGER;
BEGIN
  -- Calculate average rank points from current team members
  SELECT 
    COALESCE(AVG(u.rank_points), 0)::INTEGER,
    COALESCE(SUM(u.rank_points), 0)::INTEGER
  INTO avg_points, total_points
  FROM persistent_team_members ptm
  JOIN users u ON ptm.user_id = u.id
  WHERE ptm.team_id = p_team_id;
  
  -- Update team's rank point values
  UPDATE persistent_teams 
  SET 
    avg_rank_points = avg_points,
    total_rank_points = total_points
  WHERE id = p_team_id;
  
  RAISE LOG 'Updated rank points for team % - avg: %, total: %', p_team_id, avg_points, total_points;
END;
$function$;

-- Trigger to automatically update team rank points when members change
CREATE OR REPLACE FUNCTION public.handle_team_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update rank points for the affected team(s)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_team_avg_rank_points(NEW.team_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_team_avg_rank_points(OLD.team_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Create trigger for team member changes
DROP TRIGGER IF EXISTS team_member_rank_update ON persistent_team_members;
CREATE TRIGGER team_member_rank_update
  AFTER INSERT OR UPDATE OR DELETE ON persistent_team_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_team_member_change();

-- Initialize rank points for existing teams
DO $$
DECLARE
  team_record RECORD;
BEGIN
  FOR team_record IN SELECT id FROM persistent_teams WHERE is_active = true
  LOOP
    PERFORM public.update_team_avg_rank_points(team_record.id);
  END LOOP;
END $$;