-- Fix the advance_match_winner_secure function to properly detect final matches
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
    
    -- Place winner in appropriate slot
    IF next_match_rec.team1_id IS NULL THEN
      UPDATE matches 
      SET team1_id = p_winner_id
      WHERE id = next_match_rec.id;
    ELSIF next_match_rec.team2_id IS NULL THEN
      UPDATE matches 
      SET team2_id = p_winner_id
      WHERE id = next_match_rec.id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Next match already full');
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
      'advanced_to_match', next_match_number
    );
  END IF;
END;
$$;

-- Reset the current broken tournament state
-- First, set tournament back to 'live' status
UPDATE tournaments 
SET status = 'live', updated_at = now()
WHERE id = 'eb4f2716-67e9-40af-8be1-9375682bd0e2';

-- Reset team statuses - teams should be 'confirmed' until eliminated or win
UPDATE teams 
SET status = 'confirmed'
WHERE tournament_id = 'eb4f2716-67e9-40af-8be1-9375682bd0e2'
AND status IN ('winner', 'eliminated');

-- Advance the winner from the completed semifinal (tails3952's team) to the final
-- Based on the logs, team e7949bc4-1a49-418b-9bf6-197220d26d3b won match 275d9850-2367-48cb-9019-b76d772de915
UPDATE matches 
SET team2_id = 'e7949bc4-1a49-418b-9bf6-197220d26d3b'
WHERE tournament_id = 'eb4f2716-67e9-40af-8be1-9375682bd0e2'
AND round_number = 2 
AND match_number = 1
AND team2_id IS NULL;