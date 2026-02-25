
CREATE OR REPLACE FUNCTION public.advance_match_winner_secure(
  p_match_id uuid,
  p_winner_id uuid,
  p_loser_id uuid,
  p_tournament_id uuid,
  p_score_team1 int DEFAULT NULL,
  p_score_team2 int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_next_match RECORD;
  v_tournament RECORD;
  v_next_slot text;
  v_is_final boolean := false;
  v_next_match_ready boolean := false;
  v_total_rounds int;
  v_next_match_number int;
  v_bracket_type text;
  v_swiss_all_complete boolean := false;
  v_rr_all_complete boolean := false;
  v_losers_match RECORD;
  v_grand_final RECORD;
BEGIN
  -- Lock and fetch the current match to prevent race conditions
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_match_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;
  
  -- Check if match already has a winner AND is completed (prevent double submission)
  -- Allow re-processing if status is not yet 'completed' (e.g. medic fix scenarios)
  IF v_match.winner_id IS NOT NULL AND v_match.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Match already completed',
      'existing_winner', v_match.winner_id
    );
  END IF;
  
  -- Validate winner is one of the teams
  IF p_winner_id != v_match.team1_id AND p_winner_id != v_match.team2_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Winner must be one of the match teams');
  END IF;
  
  -- Get tournament info including bracket_type
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  v_bracket_type := COALESCE(v_tournament.bracket_type, 'single_elimination');
  
  -- Update the current match with result
  UPDATE matches
  SET 
    winner_id = p_winner_id,
    status = 'completed',
    score_team1 = COALESCE(p_score_team1, score_team1),
    score_team2 = COALESCE(p_score_team2, score_team2),
    completed_at = now(),
    updated_at = now()
  WHERE id = p_match_id;

  -- ============================================================================
  -- SINGLE ELIMINATION PROGRESSION
  -- ============================================================================
  IF v_bracket_type = 'single_elimination' THEN
    -- Calculate total rounds
    SELECT CEIL(LOG(2, GREATEST(COUNT(*), 2)))::int INTO v_total_rounds
    FROM teams
    WHERE tournament_id = p_tournament_id;
    
    -- Check if this is the final match
    v_is_final := v_match.round_number >= v_total_rounds;
    
    -- Mark loser as eliminated
    UPDATE teams
    SET status = 'eliminated'
    WHERE id = p_loser_id AND tournament_id = p_tournament_id;
    
    -- If not final, advance winner to next match
    IF NOT v_is_final THEN
      v_next_match_number := CEIL(v_match.match_number::numeric / 2);
      v_next_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'team1_id' ELSE 'team2_id' END;
      
      -- Find and update the next match
      SELECT * INTO v_next_match
      FROM matches
      WHERE tournament_id = p_tournament_id
        AND round_number = v_match.round_number + 1
        AND match_number = v_next_match_number
      FOR UPDATE;
      
      IF FOUND THEN
        IF v_next_slot = 'team1_id' THEN
          UPDATE matches SET team1_id = p_winner_id, updated_at = now() WHERE id = v_next_match.id;
        ELSE
          UPDATE matches SET team2_id = p_winner_id, updated_at = now() WHERE id = v_next_match.id;
        END IF;
        
        -- Check if next match is ready
        SELECT * INTO v_next_match FROM matches WHERE id = v_next_match.id;
        v_next_match_ready := v_next_match.team1_id IS NOT NULL AND v_next_match.team2_id IS NOT NULL;
        
        IF v_next_match_ready THEN
          UPDATE matches SET status = 'live', updated_at = now() WHERE id = v_next_match.id;
        END IF;
      END IF;
    ELSE
      -- Tournament complete
      UPDATE tournaments SET status = 'completed', updated_at = now() WHERE id = p_tournament_id;
      UPDATE teams SET status = 'winner' WHERE id = p_winner_id AND tournament_id = p_tournament_id;
    END IF;

  -- ============================================================================
  -- DOUBLE ELIMINATION PROGRESSION
  -- ============================================================================
  ELSIF v_bracket_type = 'double_elimination' THEN
    DECLARE
      v_bracket_position text;
      v_max_winners_round int;
      v_is_losers boolean;
      v_is_grand_final boolean;
      v_is_reset boolean;
    BEGIN
      v_bracket_position := COALESCE(v_match.bracket_position, 'winners');
      v_is_losers := v_bracket_position = 'losers';
      v_is_grand_final := v_bracket_position = 'grand_final';
      v_is_reset := v_bracket_position = 'grand_final_reset';
      
      IF v_is_grand_final OR v_is_reset THEN
        UPDATE tournaments SET status = 'completed', updated_at = now() WHERE id = p_tournament_id;
        UPDATE teams SET status = 'winner' WHERE id = p_winner_id AND tournament_id = p_tournament_id;
        v_is_final := true;
        
        IF v_is_grand_final AND p_winner_id = v_match.team2_id THEN
          SELECT * INTO v_grand_final
          FROM matches
          WHERE tournament_id = p_tournament_id
            AND bracket_position = 'grand_final_reset'
          FOR UPDATE;
          
          IF FOUND THEN
            UPDATE matches 
            SET team1_id = v_match.team1_id, team2_id = v_match.team2_id,
                status = 'live', updated_at = now()
            WHERE id = v_grand_final.id;
            v_is_final := false;
            UPDATE tournaments SET status = 'live', updated_at = now() WHERE id = p_tournament_id;
          END IF;
        END IF;
        
      ELSIF v_is_losers THEN
        UPDATE teams SET status = 'eliminated'
        WHERE id = p_loser_id AND tournament_id = p_tournament_id;
        
        v_next_match_number := CEIL(v_match.match_number::numeric / 2);
        v_next_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'team1_id' ELSE 'team2_id' END;
        
        SELECT * INTO v_next_match
        FROM matches
        WHERE tournament_id = p_tournament_id
          AND bracket_position = 'losers'
          AND round_number = v_match.round_number + 1
          AND match_number = v_next_match_number
        FOR UPDATE;
        
        IF NOT FOUND THEN
          SELECT * INTO v_next_match
          FROM matches
          WHERE tournament_id = p_tournament_id
            AND bracket_position = 'grand_final'
          FOR UPDATE;
        END IF;
        
        IF FOUND THEN
          IF v_next_slot = 'team1_id' THEN
            UPDATE matches SET team1_id = p_winner_id, updated_at = now() WHERE id = v_next_match.id;
          ELSE
            UPDATE matches SET team2_id = p_winner_id, updated_at = now() WHERE id = v_next_match.id;
          END IF;
          
          SELECT * INTO v_next_match FROM matches WHERE id = v_next_match.id;
          v_next_match_ready := v_next_match.team1_id IS NOT NULL AND v_next_match.team2_id IS NOT NULL;
          
          IF v_next_match_ready THEN
            UPDATE matches SET status = 'live', updated_at = now() WHERE id = v_next_match.id;
          END IF;
        END IF;
        
      ELSE
        SELECT MAX(round_number) INTO v_max_winners_round
        FROM matches
        WHERE tournament_id = p_tournament_id
          AND bracket_position = 'winners';
        
        v_next_match_number := CEIL(v_match.match_number::numeric / 2);
        v_next_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'team1_id' ELSE 'team2_id' END;
        
        SELECT * INTO v_next_match
        FROM matches
        WHERE tournament_id = p_tournament_id
          AND bracket_position = 'winners'
          AND round_number = v_match.round_number + 1
          AND match_number = v_next_match_number
        FOR UPDATE;
        
        IF FOUND THEN
          IF v_next_slot = 'team1_id' THEN
            UPDATE matches SET team1_id = p_winner_id, updated_at = now() WHERE id = v_next_match.id;
          ELSE
            UPDATE matches SET team2_id = p_winner_id, updated_at = now() WHERE id = v_next_match.id;
          END IF;
          
          SELECT * INTO v_next_match FROM matches WHERE id = v_next_match.id;
          v_next_match_ready := v_next_match.team1_id IS NOT NULL AND v_next_match.team2_id IS NOT NULL;
          
          IF v_next_match_ready THEN
            UPDATE matches SET status = 'live', updated_at = now() WHERE id = v_next_match.id;
          END IF;
        END IF;
        
        SELECT * INTO v_losers_match
        FROM matches
        WHERE tournament_id = p_tournament_id
          AND bracket_position = 'losers'
          AND round_number = v_match.round_number
        ORDER BY match_number
        LIMIT 1
        FOR UPDATE;
        
        IF FOUND THEN
          IF v_losers_match.team1_id IS NULL THEN
            UPDATE matches SET team1_id = p_loser_id, updated_at = now() WHERE id = v_losers_match.id;
          ELSE
            UPDATE matches SET team2_id = p_loser_id, updated_at = now() WHERE id = v_losers_match.id;
          END IF;
          
          SELECT * INTO v_losers_match FROM matches WHERE id = v_losers_match.id;
          IF v_losers_match.team1_id IS NOT NULL AND v_losers_match.team2_id IS NOT NULL THEN
            UPDATE matches SET status = 'live', updated_at = now() WHERE id = v_losers_match.id;
          END IF;
        END IF;
      END IF;
    END;
    
    RETURN jsonb_build_object(
      'success', true,
      'tournament_completed', v_is_final,
      'winner_team_id', CASE WHEN v_is_final THEN p_winner_id ELSE NULL END,
      'next_match_id', v_next_match.id,
      'next_match_ready', v_next_match_ready,
      'format', 'double_elimination'
    );

  -- ============================================================================
  -- SWISS PROGRESSION
  -- ============================================================================
  ELSIF v_bracket_type = 'swiss' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM matches 
      WHERE tournament_id = p_tournament_id 
        AND round_number = v_match.round_number
        AND status != 'completed'
        AND team1_id IS NOT NULL 
        AND team2_id IS NOT NULL
    ) INTO v_swiss_all_complete;
    
    IF v_swiss_all_complete THEN
      DECLARE
        v_max_round int;
        v_swiss_total_rounds int;
      BEGIN
        SELECT MAX(round_number) INTO v_max_round FROM matches WHERE tournament_id = p_tournament_id;
        v_swiss_total_rounds := COALESCE(v_tournament.swiss_rounds, 5);
        
        IF v_max_round >= v_swiss_total_rounds THEN
          UPDATE tournaments SET status = 'completed', updated_at = now() WHERE id = p_tournament_id;
          v_is_final := true;
        END IF;
      END;
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'tournament_completed', v_is_final,
      'round_completed', v_swiss_all_complete,
      'current_round', v_match.round_number,
      'format', 'swiss'
    );

  -- ============================================================================
  -- ROUND ROBIN
  -- ============================================================================
  ELSIF v_bracket_type = 'round_robin' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM matches 
      WHERE tournament_id = p_tournament_id 
        AND status != 'completed'
        AND team1_id IS NOT NULL 
        AND team2_id IS NOT NULL
    ) INTO v_rr_all_complete;
    
    IF v_rr_all_complete THEN
      UPDATE tournaments SET status = 'completed', updated_at = now() WHERE id = p_tournament_id;
      v_is_final := true;
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'tournament_completed', v_rr_all_complete,
      'format', 'round_robin'
    );
    
  END IF;

  -- Log the advancement (FIXED: cast p_match_id to uuid-compatible format)
  BEGIN
    INSERT INTO audit_logs (action, table_name, record_id, user_id, new_values)
    VALUES (
      'MATCH_RESULT_ADVANCED',
      'matches',
      p_match_id,
      auth.uid(),
      jsonb_build_object(
        'winner_id', p_winner_id,
        'loser_id', p_loser_id,
        'score_team1', p_score_team1,
        'score_team2', p_score_team2,
        'bracket_type', v_bracket_type,
        'is_final', v_is_final
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't let audit log failures prevent match completion
    RAISE LOG 'Audit log insert failed (non-fatal): %', SQLERRM;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'tournament_completed', v_is_final,
    'winner_team_id', CASE WHEN v_is_final THEN p_winner_id ELSE NULL END,
    'next_match_id', v_next_match.id,
    'next_match_ready', v_next_match_ready,
    'format', v_bracket_type
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in advance_match_winner_secure: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
