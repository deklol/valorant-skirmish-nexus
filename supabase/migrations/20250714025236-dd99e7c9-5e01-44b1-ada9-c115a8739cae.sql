-- Update the advance_match_winner_secure function to automatically set next matches to 'live' when both teams are assigned
CREATE OR REPLACE FUNCTION public.advance_match_winner_secure(
  p_match_id uuid,
  p_winner_id uuid,
  p_loser_id uuid,
  p_tournament_id uuid,
  p_score_team1 integer DEFAULT NULL,
  p_score_team2 integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_match_rec RECORD;
  next_match_rec RECORD;
  max_round_number integer;
  next_round integer;
  next_match_number integer;
  teams_in_next_match integer;
  other_team_id uuid;
BEGIN
  -- Get current match details
  SELECT * INTO current_match_rec 
  FROM matches 
  WHERE id = p_match_id;
  
  IF current_match_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;
  
  -- Update the current match with results
  UPDATE matches 
  SET 
    winner_id = p_winner_id,
    status = 'completed',
    completed_at = now(),
    score_team1 = COALESCE(p_score_team1, score_team1),
    score_team2 = COALESCE(p_score_team2, score_team2)
  WHERE id = p_match_id;
  
  -- Find the maximum round number in this tournament
  SELECT MAX(round_number) INTO max_round_number
  FROM matches 
  WHERE tournament_id = p_tournament_id;
  
  -- Check if this is the final match (highest round)
  IF current_match_rec.round_number = max_round_number THEN
    -- This is the final match - complete the tournament
    UPDATE tournaments 
    SET status = 'completed', updated_at = now()
    WHERE id = p_tournament_id;
    
    -- Set winner team status
    UPDATE teams 
    SET status = 'winner'
    WHERE id = p_winner_id;
    
    -- Set loser team status  
    UPDATE teams 
    SET status = 'eliminated'
    WHERE id = p_loser_id;
    
    RAISE LOG 'Tournament % completed with winner %', p_tournament_id, p_winner_id;
    
    -- Award achievements and increment statistics
    PERFORM increment_user_tournaments_played(tm.user_id)
    FROM team_members tm 
    WHERE tm.team_id IN (
      SELECT DISTINCT t.id FROM teams t WHERE t.tournament_id = p_tournament_id
    );
    
    PERFORM increment_user_tournament_wins(tm.user_id)
    FROM team_members tm 
    WHERE tm.team_id = p_winner_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'tournament_completed', true,
      'winner_team_id', p_winner_id
    );
  ELSE
    -- Not the final match - advance winner to next round
    next_round := current_match_rec.round_number + 1;
    
    -- Calculate which match in the next round this winner should go to
    next_match_number := CEIL(current_match_rec.match_number::decimal / 2);
    
    -- Find the next match
    SELECT * INTO next_match_rec
    FROM matches 
    WHERE tournament_id = p_tournament_id 
    AND round_number = next_round 
    AND match_number = next_match_number;
    
    IF next_match_rec IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Next match not found');
    END IF;
    
    -- Count teams already in next match
    teams_in_next_match := 0;
    IF next_match_rec.team1_id IS NOT NULL THEN
      teams_in_next_match := teams_in_next_match + 1;
    END IF;
    IF next_match_rec.team2_id IS NOT NULL THEN
      teams_in_next_match := teams_in_next_match + 1;
    END IF;
    
    -- Place winner in appropriate slot and check if match becomes ready
    IF next_match_rec.team1_id IS NULL THEN
      UPDATE matches 
      SET team1_id = p_winner_id
      WHERE id = next_match_rec.id;
      
      -- Check if the other slot has a team (match becomes ready)
      other_team_id := next_match_rec.team2_id;
    ELSIF next_match_rec.team2_id IS NULL THEN
      UPDATE matches 
      SET team2_id = p_winner_id
      WHERE id = next_match_rec.id;
      
      -- Check if the other slot has a team (match becomes ready)
      other_team_id := next_match_rec.team1_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Next match already full');
    END IF;
    
    -- If both teams are now assigned and match is pending, set it to live
    IF other_team_id IS NOT NULL AND next_match_rec.status = 'pending' THEN
      UPDATE matches 
      SET status = 'live'
      WHERE id = next_match_rec.id;
      
      RAISE LOG 'Set match R%M% to live - both teams assigned', next_round, next_match_number;
    END IF;
    
    -- Set loser team status
    UPDATE teams 
    SET status = 'eliminated'
    WHERE id = p_loser_id;
    
    RAISE LOG 'Advanced team % from R%M% to R%M%', p_winner_id, current_match_rec.round_number, current_match_rec.match_number, next_round, next_match_number;
    
    RETURN jsonb_build_object(
      'success', true, 
      'tournament_completed', false,
      'next_match_id', next_match_rec.id,
      'advanced_to_round', next_round,
      'advanced_to_match', next_match_number,
      'next_match_ready', (other_team_id IS NOT NULL)
    );
  END IF;
END;
$$;