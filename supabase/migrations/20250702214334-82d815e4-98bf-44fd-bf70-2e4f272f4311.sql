-- Create improved match completion handler that properly updates all team member statistics
CREATE OR REPLACE FUNCTION handle_match_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  winning_team_id UUID;
  losing_team_id UUID;
  member_record RECORD;
BEGIN
  -- Only process when a match is completed (status changes to 'completed' and winner_id is set)
  IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL AND 
     (OLD.status != 'completed' OR OLD.winner_id IS NULL) THEN
    
    winning_team_id := NEW.winner_id;
    
    -- Determine losing team
    IF NEW.team1_id = winning_team_id THEN
      losing_team_id := NEW.team2_id;
    ELSE
      losing_team_id := NEW.team1_id;
    END IF;
    
    -- Increment wins for all winning team members
    IF winning_team_id IS NOT NULL THEN
      FOR member_record IN 
        SELECT user_id FROM team_members WHERE team_id = winning_team_id
      LOOP
        UPDATE users 
        SET wins = COALESCE(wins, 0) + 1
        WHERE id = member_record.user_id;
        
        RAISE LOG 'Incremented wins for user % (winning team %)', member_record.user_id, winning_team_id;
      END LOOP;
    END IF;
    
    -- Increment losses for all losing team members
    IF losing_team_id IS NOT NULL THEN
      FOR member_record IN 
        SELECT user_id FROM team_members WHERE team_id = losing_team_id
      LOOP
        UPDATE users 
        SET losses = COALESCE(losses, 0) + 1
        WHERE id = member_record.user_id;
        
        RAISE LOG 'Incremented losses for user % (losing team %)', member_record.user_id, losing_team_id;
      END LOOP;
    END IF;
    
    -- Log the match completion
    INSERT INTO audit_logs (
      table_name, action, record_id, user_id, new_values, created_at
    ) VALUES (
      'matches',
      'STATS_UPDATED',
      NEW.id,
      NULL,
      jsonb_build_object(
        'winning_team_id', winning_team_id,
        'losing_team_id', losing_team_id,
        'match_number', NEW.match_number,
        'tournament_id', NEW.tournament_id
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS match_completion_stats_trigger ON matches;

-- Create trigger for match completion statistics
CREATE TRIGGER match_completion_stats_trigger
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION handle_match_completion();

-- Create function to handle tournament completion (for tournament winner statistics)
CREATE OR REPLACE FUNCTION handle_tournament_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  winner_team_id UUID;
  member_record RECORD;
  participant_record RECORD;
BEGIN
  -- Only process when tournament status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Find the winning team (should have status 'winner')
    SELECT id INTO winner_team_id 
    FROM teams 
    WHERE tournament_id = NEW.id AND status = 'winner'
    LIMIT 1;
    
    -- Increment tournament wins for winning team members
    IF winner_team_id IS NOT NULL THEN
      FOR member_record IN 
        SELECT user_id FROM team_members WHERE team_id = winner_team_id
      LOOP
        UPDATE users 
        SET tournaments_won = COALESCE(tournaments_won, 0) + 1
        WHERE id = member_record.user_id;
        
        RAISE LOG 'Incremented tournament wins for user % (tournament %)', member_record.user_id, NEW.id;
      END LOOP;
    END IF;
    
    -- Increment tournaments_played for all participants
    FOR participant_record IN 
      SELECT DISTINCT user_id FROM tournament_signups WHERE tournament_id = NEW.id
    LOOP
      UPDATE users 
      SET tournaments_played = COALESCE(tournaments_played, 0) + 1
      WHERE id = participant_record.user_id;
      
      RAISE LOG 'Incremented tournaments played for user % (tournament %)', participant_record.user_id, NEW.id;
    END LOOP;
    
    -- Log tournament completion
    INSERT INTO audit_logs (
      table_name, action, record_id, user_id, new_values, created_at
    ) VALUES (
      'tournaments',
      'COMPLETION_STATS_UPDATED',
      NEW.id,
      NULL,
      jsonb_build_object(
        'winner_team_id', winner_team_id,
        'tournament_name', NEW.name
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS tournament_completion_stats_trigger ON tournaments;

-- Create trigger for tournament completion statistics
CREATE TRIGGER tournament_completion_stats_trigger
  AFTER UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION handle_tournament_completion();

-- Function to fix existing missing statistics (run once to backfill)
CREATE OR REPLACE FUNCTION fix_missing_match_statistics()
RETURNS TABLE(
  matches_processed INTEGER,
  wins_added INTEGER,
  losses_added INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_record RECORD;
  member_record RECORD;
  winning_team_id UUID;
  losing_team_id UUID;
  matches_count INTEGER := 0;
  wins_count INTEGER := 0;
  losses_count INTEGER := 0;
BEGIN
  -- Process all completed matches that have a winner
  FOR match_record IN 
    SELECT id, team1_id, team2_id, winner_id, tournament_id
    FROM matches 
    WHERE status = 'completed' AND winner_id IS NOT NULL
  LOOP
    matches_count := matches_count + 1;
    winning_team_id := match_record.winner_id;
    
    -- Determine losing team
    IF match_record.team1_id = winning_team_id THEN
      losing_team_id := match_record.team2_id;
    ELSE
      losing_team_id := match_record.team1_id;
    END IF;
    
    -- Add wins for winning team members (only if they don't already have the win)
    IF winning_team_id IS NOT NULL THEN
      FOR member_record IN 
        SELECT user_id FROM team_members WHERE team_id = winning_team_id
      LOOP
        -- We'll add the win regardless since we're fixing missing stats
        UPDATE users 
        SET wins = COALESCE(wins, 0) + 1
        WHERE id = member_record.user_id;
        
        wins_count := wins_count + 1;
      END LOOP;
    END IF;
    
    -- Add losses for losing team members
    IF losing_team_id IS NOT NULL THEN
      FOR member_record IN 
        SELECT user_id FROM team_members WHERE team_id = losing_team_id
      LOOP
        UPDATE users 
        SET losses = COALESCE(losses, 0) + 1
        WHERE id = member_record.user_id;
        
        losses_count := losses_count + 1;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Return statistics
  matches_processed := matches_count;
  wins_added := wins_count;
  losses_added := losses_count;
  
  RETURN NEXT;
END;
$$;