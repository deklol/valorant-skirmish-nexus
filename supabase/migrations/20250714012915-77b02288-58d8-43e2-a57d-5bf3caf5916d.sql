-- Fix RLS policies and create security definer function for match progression

-- Step 1: Add RLS policy to allow system updates during result processing
CREATE POLICY "System can update matches during result processing" 
ON matches FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Step 2: Create security definer function for match advancement
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
  result jsonb;
  current_match_rec RECORD;
  next_match_rec RECORD;
  target_slot text;
  other_slot text;
  is_final boolean := false;
  next_match_ready boolean := false;
BEGIN
  -- Update the match as completed
  UPDATE matches SET
    winner_id = p_winner_id,
    status = 'completed',
    completed_at = now(),
    score_team1 = COALESCE(p_score_team1, score_team1),
    score_team2 = COALESCE(p_score_team2, score_team2)
  WHERE id = p_match_id;

  -- Get the updated match
  SELECT * INTO current_match_rec FROM matches WHERE id = p_match_id;
  
  -- Check if this is the final match (round 1 in single elimination)
  IF current_match_rec.round_number = 1 THEN
    is_final := true;
    
    -- Mark winner and loser teams
    UPDATE teams SET status = 'winner' WHERE id = p_winner_id;
    UPDATE teams SET status = 'eliminated' WHERE id = p_loser_id;
    
    -- Complete tournament
    UPDATE tournaments SET 
      status = 'completed',
      updated_at = now()
    WHERE id = p_tournament_id;
    
    RAISE LOG 'Tournament % completed with winner %', p_tournament_id, p_winner_id;
    
    result := jsonb_build_object(
      'success', true,
      'tournamentComplete', true,
      'winner', p_winner_id
    );
  ELSE
    -- Determine target slot for winner advancement
    target_slot := CASE 
      WHEN current_match_rec.match_number % 2 = 1 THEN 'team1_id'
      ELSE 'team2_id'
    END;
    
    other_slot := CASE 
      WHEN target_slot = 'team1_id' THEN 'team2_id'
      ELSE 'team1_id'
    END;
    
    -- Find next match (one round down, half the match number rounded up)
    SELECT * INTO next_match_rec 
    FROM matches 
    WHERE tournament_id = p_tournament_id
      AND round_number = current_match_rec.round_number - 1
      AND match_number = CEIL(current_match_rec.match_number::decimal / 2)
    LIMIT 1;
    
    IF next_match_rec IS NOT NULL THEN
      -- Advance winner to next match
      EXECUTE format('UPDATE matches SET %I = $1 WHERE id = $2', target_slot)
      USING p_winner_id, next_match_rec.id;
      
      -- Check if next match is ready (both teams assigned)
      EXECUTE format('SELECT %I FROM matches WHERE id = $1', other_slot)
      INTO next_match_ready
      USING next_match_rec.id;
      
      IF next_match_ready IS NOT NULL AND next_match_rec.status = 'pending' THEN
        UPDATE matches SET status = 'live' WHERE id = next_match_rec.id;
        next_match_ready := true;
        RAISE LOG 'Next match % is now live with both teams', next_match_rec.id;
      ELSE
        next_match_ready := false;
      END IF;
      
      RAISE LOG 'Advanced winner % to match % in slot %', p_winner_id, next_match_rec.id, target_slot;
    END IF;
    
    -- Eliminate loser team
    UPDATE teams SET status = 'eliminated' WHERE id = p_loser_id;
    
    result := jsonb_build_object(
      'success', true,
      'tournamentComplete', false,
      'nextMatchReady', next_match_ready,
      'nextMatchId', COALESCE(next_match_rec.id, null)
    );
  END IF;
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in advance_match_winner_secure: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Step 3: Fix side choice inconsistencies for veto system
UPDATE map_veto_actions 
SET side_choice = 'Defense'
WHERE side_choice = 'defend' OR side_choice = 'Defend';

UPDATE map_veto_actions 
SET side_choice = 'Attack'
WHERE side_choice = 'attack' OR side_choice = 'Attack';

-- Step 4: Fix current tournament state - get current tournament and fix team statuses
DO $$
DECLARE
  current_tournament_id uuid;
  team_rec RECORD;
BEGIN
  -- Get the most recent tournament
  SELECT id INTO current_tournament_id
  FROM tournaments
  WHERE status IN ('live', 'balancing')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF current_tournament_id IS NOT NULL THEN
    -- Set all teams to confirmed status initially
    UPDATE teams 
    SET status = 'confirmed'
    WHERE tournament_id = current_tournament_id 
      AND status = 'pending';
    
    -- Set eliminated teams based on lost matches
    UPDATE teams 
    SET status = 'eliminated'
    WHERE id IN (
      SELECT DISTINCT 
        CASE 
          WHEN team1_id = winner_id THEN team2_id
          WHEN team2_id = winner_id THEN team1_id
        END as loser_id
      FROM matches
      WHERE tournament_id = current_tournament_id
        AND status = 'completed'
        AND winner_id IS NOT NULL
        AND (team1_id IS NOT NULL AND team2_id IS NOT NULL)
    );
    
    RAISE LOG 'Fixed team statuses for tournament %', current_tournament_id;
  END IF;
END $$;

-- Step 5: Complete any matches that have winners but wrong status
UPDATE matches 
SET status = 'completed',
    completed_at = COALESCE(completed_at, now())
WHERE winner_id IS NOT NULL 
  AND status != 'completed';

RAISE LOG 'Applied comprehensive fixes for match progression and veto system';