
-- First, let's check the current state and fix _dek's missing tournament win
-- Update _dek's tournament wins count
UPDATE users 
SET tournaments_won = 1 
WHERE discord_username = '_dek';

-- Find and update any teams that should have winner status but don't
-- This will help us identify the pattern of missing winner updates
UPDATE teams 
SET status = 'winner'
WHERE id IN (
  SELECT DISTINCT winner_id 
  FROM matches 
  WHERE status = 'completed' 
  AND winner_id IS NOT NULL 
  AND tournament_id IN (
    SELECT id FROM tournaments WHERE status = 'completed'
  )
) AND status != 'winner';

-- Create a function to retroactively fix tournament wins for all affected users
CREATE OR REPLACE FUNCTION fix_missing_tournament_wins()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fixed_count INTEGER := 0;
  user_record RECORD;
BEGIN
  -- Find users who are members of winning teams but don't have the tournament win counted
  FOR user_record IN
    SELECT DISTINCT tm.user_id, COUNT(*) as missing_wins
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    JOIN tournaments tour ON t.tournament_id = tour.id
    WHERE t.status = 'winner' 
    AND tour.status = 'completed'
    GROUP BY tm.user_id
  LOOP
    -- Update the user's tournament wins
    UPDATE users 
    SET tournaments_won = COALESCE(tournaments_won, 0) + user_record.missing_wins
    WHERE id = user_record.user_id
    AND tournaments_won < user_record.missing_wins;
    
    IF FOUND THEN
      fixed_count := fixed_count + 1;
    END IF;
  END LOOP;
  
  RETURN fixed_count;
END;
$$;

-- Run the fix function
SELECT fix_missing_tournament_wins();
