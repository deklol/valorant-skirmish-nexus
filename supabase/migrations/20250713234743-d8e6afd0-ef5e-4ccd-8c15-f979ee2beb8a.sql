-- Fix the handle_match_completion function to handle NULL team scenarios properly
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
    
    -- Determine losing team with proper NULL handling
    IF NEW.team1_id IS NOT NULL AND NEW.team2_id IS NOT NULL THEN
      IF NEW.team1_id = winning_team_id THEN
        losing_team_id := NEW.team2_id;
      ELSIF NEW.team2_id = winning_team_id THEN
        losing_team_id := NEW.team1_id;
      ELSE
        -- Winner not found in either team slot - skip processing
        RAISE LOG 'Warning: Winner team % not found in match teams (% vs %)', winning_team_id, NEW.team1_id, NEW.team2_id;
        RETURN NEW;
      END IF;
    ELSE
      -- One or both teams are NULL - skip processing
      RAISE LOG 'Warning: Match has NULL team(s): team1=%, team2=%', NEW.team1_id, NEW.team2_id;
      RETURN NEW;
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