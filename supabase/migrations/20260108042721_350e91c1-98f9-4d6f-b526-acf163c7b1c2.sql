-- Tournament Flow Production Hardening Migration
-- Adds safeguards against duplicate brackets, race conditions, and provides rollback capabilities

-- =====================================================
-- 1. ADD NEW COLUMNS TO TOURNAMENTS TABLE
-- =====================================================

-- Flag to prevent concurrent bracket generation
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS generating_bracket boolean DEFAULT false;

-- Flag to indicate bracket has been generated (prevents team changes)
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS bracket_generated boolean DEFAULT false;

-- =====================================================
-- 2. CREATE RESET MATCH SECURE FUNCTION
-- =====================================================
-- Resets a completed match back to live/pending state and clears progression

CREATE OR REPLACE FUNCTION public.reset_match_secure(
  p_match_id uuid,
  p_reason text DEFAULT 'Admin reset'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_next_match RECORD;
  v_tournament_id uuid;
  v_old_winner_id uuid;
  v_next_match_id uuid;
  v_slot_cleared text;
BEGIN
  -- Lock and fetch the match
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_match_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;
  
  v_tournament_id := v_match.tournament_id;
  v_old_winner_id := v_match.winner_id;
  
  -- If match had no winner, nothing to reset
  IF v_old_winner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match has no winner to reset');
  END IF;
  
  -- Find the next match this winner advanced to
  SELECT * INTO v_next_match
  FROM matches
  WHERE tournament_id = v_tournament_id
    AND round_number = v_match.round_number + 1
    AND (team1_id = v_old_winner_id OR team2_id = v_old_winner_id)
  FOR UPDATE;
  
  -- Clear the winner from the next match if found
  IF FOUND THEN
    v_next_match_id := v_next_match.id;
    
    IF v_next_match.team1_id = v_old_winner_id THEN
      UPDATE matches SET team1_id = NULL, updated_at = now()
      WHERE id = v_next_match.id;
      v_slot_cleared := 'team1_id';
    ELSIF v_next_match.team2_id = v_old_winner_id THEN
      UPDATE matches SET team2_id = NULL, updated_at = now()
      WHERE id = v_next_match.id;
      v_slot_cleared := 'team2_id';
    END IF;
    
    -- If next match was completed, we need to recursively reset it too
    IF v_next_match.winner_id IS NOT NULL THEN
      PERFORM reset_match_secure(v_next_match.id, 'Cascade from match ' || p_match_id::text);
    END IF;
  END IF;
  
  -- Reset the original match
  UPDATE matches
  SET 
    winner_id = NULL,
    status = 'live',
    score_team1 = NULL,
    score_team2 = NULL,
    completed_at = NULL,
    updated_at = now()
  WHERE id = p_match_id;
  
  -- Un-eliminate the loser team if they were marked eliminated
  UPDATE teams
  SET status = 'active'
  WHERE id = (
    CASE 
      WHEN v_match.team1_id = v_old_winner_id THEN v_match.team2_id
      ELSE v_match.team1_id
    END
  )
  AND tournament_id = v_tournament_id
  AND status = 'eliminated';
  
  -- Log the action
  INSERT INTO audit_logs (action, table_name, record_id, user_id, old_values, new_values)
  VALUES (
    'MATCH_RESET',
    'matches',
    p_match_id::text,
    auth.uid(),
    jsonb_build_object(
      'winner_id', v_old_winner_id,
      'status', v_match.status,
      'score_team1', v_match.score_team1,
      'score_team2', v_match.score_team2
    ),
    jsonb_build_object(
      'reason', p_reason,
      'next_match_cleared', v_next_match_id,
      'slot_cleared', v_slot_cleared
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'match_reset', p_match_id,
    'next_match_cleared', v_next_match_id,
    'slot_cleared', v_slot_cleared,
    'previous_winner', v_old_winner_id
  );
END;
$$;

-- =====================================================
-- 3. CREATE ROLLBACK MATCH RESULT FUNCTION
-- =====================================================
-- Full rollback that cascades through the bracket

CREATE OR REPLACE FUNCTION public.rollback_match_result(
  p_match_id uuid,
  p_reason text DEFAULT 'Admin rollback'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_matches_rolled_back uuid[] := ARRAY[]::uuid[];
  v_match RECORD;
  v_current_match_id uuid;
  v_cascade_count int := 0;
BEGIN
  v_current_match_id := p_match_id;
  
  -- First, collect all matches that need rollback (this match and all descendants)
  -- We need to rollback from the furthest match back to this one
  
  -- Start the rollback
  v_result := reset_match_secure(p_match_id, p_reason);
  
  IF (v_result->>'success')::boolean THEN
    v_matches_rolled_back := array_append(v_matches_rolled_back, p_match_id);
    
    -- Count cascaded matches
    IF v_result->>'next_match_cleared' IS NOT NULL THEN
      v_cascade_count := v_cascade_count + 1;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', (v_result->>'success')::boolean,
    'matches_rolled_back', v_matches_rolled_back,
    'cascade_count', v_cascade_count,
    'details', v_result
  );
END;
$$;

-- =====================================================
-- 4. CREATE GENERATE BRACKET SECURE FUNCTION
-- =====================================================
-- Prevents concurrent bracket generation with database-level locking

CREATE OR REPLACE FUNCTION public.generate_bracket_secure(
  p_tournament_id uuid,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_existing_matches int;
BEGIN
  -- Lock tournament row to prevent concurrent operations
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  -- Check if bracket generation is already in progress
  IF v_tournament.generating_bracket = true THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Bracket generation already in progress',
      'code', 'GENERATION_IN_PROGRESS'
    );
  END IF;
  
  -- Count existing matches
  SELECT COUNT(*) INTO v_existing_matches
  FROM matches
  WHERE tournament_id = p_tournament_id;
  
  -- Check for existing bracket
  IF v_existing_matches > 0 AND NOT p_force THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Bracket already exists. Use force=true to regenerate.',
      'code', 'BRACKET_EXISTS',
      'existing_matches', v_existing_matches
    );
  END IF;
  
  -- Set generating flag
  UPDATE tournaments
  SET generating_bracket = true, updated_at = now()
  WHERE id = p_tournament_id;
  
  -- If force regeneration, delete existing matches
  IF p_force AND v_existing_matches > 0 THEN
    -- Delete match result submissions first
    DELETE FROM match_result_submissions
    WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = p_tournament_id);
    
    -- Delete map veto actions
    DELETE FROM map_veto_actions
    WHERE veto_session_id IN (
      SELECT id FROM map_veto_sessions 
      WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = p_tournament_id)
    );
    
    -- Delete map veto sessions
    DELETE FROM map_veto_sessions
    WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = p_tournament_id);
    
    -- Delete match maps
    DELETE FROM match_maps
    WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = p_tournament_id);
    
    -- Delete matches
    DELETE FROM matches WHERE tournament_id = p_tournament_id;
    
    -- Log the deletion
    INSERT INTO audit_logs (action, table_name, record_id, user_id, new_values)
    VALUES (
      'BRACKET_CLEARED_FOR_REGENERATION',
      'tournaments',
      p_tournament_id::text,
      auth.uid(),
      jsonb_build_object('matches_deleted', v_existing_matches)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'can_generate', true,
    'tournament_id', p_tournament_id,
    'cleared_matches', CASE WHEN p_force THEN v_existing_matches ELSE 0 END
  );
END;
$$;

-- =====================================================
-- 5. CREATE COMPLETE BRACKET GENERATION FUNCTION
-- =====================================================
-- Called after matches are inserted to finalize the generation

CREATE OR REPLACE FUNCTION public.complete_bracket_generation(
  p_tournament_id uuid,
  p_success boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_count int;
BEGIN
  -- Count inserted matches
  SELECT COUNT(*) INTO v_match_count
  FROM matches
  WHERE tournament_id = p_tournament_id;
  
  -- Update tournament flags
  UPDATE tournaments
  SET 
    generating_bracket = false,
    bracket_generated = CASE WHEN p_success AND v_match_count > 0 THEN true ELSE bracket_generated END,
    updated_at = now()
  WHERE id = p_tournament_id;
  
  -- Log the completion
  IF p_success AND v_match_count > 0 THEN
    INSERT INTO audit_logs (action, table_name, record_id, user_id, new_values)
    VALUES (
      'BRACKET_GENERATION_COMPLETE',
      'tournaments',
      p_tournament_id::text,
      auth.uid(),
      jsonb_build_object('match_count', v_match_count)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'bracket_generated', p_success AND v_match_count > 0,
    'match_count', v_match_count
  );
END;
$$;

-- =====================================================
-- 6. CREATE VALIDATE BRACKET STRUCTURE FUNCTION
-- =====================================================
-- Validates bracket integrity before going live

CREATE OR REPLACE FUNCTION public.validate_bracket_structure(
  p_tournament_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_team_count int;
  v_match_count int;
  v_round1_matches int;
  v_expected_rounds int;
  v_expected_matches int;
  v_orphan_matches int;
  v_issues text[] := ARRAY[]::text[];
  v_warnings text[] := ARRAY[]::text[];
  v_round1_unassigned int;
BEGIN
  -- Get tournament info
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'issues', ARRAY['Tournament not found']);
  END IF;
  
  -- Count teams
  SELECT COUNT(*) INTO v_team_count
  FROM teams
  WHERE tournament_id = p_tournament_id;
  
  -- Count matches
  SELECT COUNT(*) INTO v_match_count
  FROM matches
  WHERE tournament_id = p_tournament_id;
  
  -- Check if bracket exists
  IF v_match_count = 0 THEN
    v_issues := array_append(v_issues, 'No bracket generated - no matches exist');
    RETURN jsonb_build_object('valid', false, 'issues', v_issues, 'warnings', v_warnings);
  END IF;
  
  -- Count round 1 matches
  SELECT COUNT(*) INTO v_round1_matches
  FROM matches
  WHERE tournament_id = p_tournament_id AND round_number = 1;
  
  -- Check round 1 matches have teams assigned
  SELECT COUNT(*) INTO v_round1_unassigned
  FROM matches
  WHERE tournament_id = p_tournament_id 
    AND round_number = 1
    AND (team1_id IS NULL AND team2_id IS NULL);
  
  IF v_round1_unassigned > 0 THEN
    v_issues := array_append(v_issues, 'Round 1 has ' || v_round1_unassigned || ' matches with no teams assigned');
  END IF;
  
  -- Check for orphan matches (later rounds with no teams and no feeder matches)
  SELECT COUNT(*) INTO v_orphan_matches
  FROM matches m
  WHERE m.tournament_id = p_tournament_id
    AND m.round_number > 1
    AND m.team1_id IS NULL
    AND m.team2_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM matches prev
      WHERE prev.tournament_id = p_tournament_id
        AND prev.round_number = m.round_number - 1
    );
  
  IF v_orphan_matches > 0 THEN
    v_warnings := array_append(v_warnings, v_orphan_matches || ' matches in later rounds have no teams (may be waiting for advancement)');
  END IF;
  
  -- Calculate expected structure
  v_expected_rounds := CEIL(LOG(2, GREATEST(v_team_count, 2)));
  v_expected_matches := POWER(2, v_expected_rounds) - 1;
  
  -- Validate match count (allow for byes which reduce match count)
  IF v_match_count < (v_team_count - 1) THEN
    v_issues := array_append(v_issues, 'Not enough matches for team count. Have ' || v_match_count || ', need at least ' || (v_team_count - 1));
  END IF;
  
  -- Check if all teams are assigned to at least one match
  DECLARE
    v_unassigned_teams int;
  BEGIN
    SELECT COUNT(*) INTO v_unassigned_teams
    FROM teams t
    WHERE t.tournament_id = p_tournament_id
      AND t.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM matches m
        WHERE m.tournament_id = p_tournament_id
          AND (m.team1_id = t.id OR m.team2_id = t.id)
      );
    
    IF v_unassigned_teams > 0 THEN
      v_issues := array_append(v_issues, v_unassigned_teams || ' teams are not assigned to any match');
    END IF;
  END;
  
  RETURN jsonb_build_object(
    'valid', array_length(v_issues, 1) IS NULL OR array_length(v_issues, 1) = 0,
    'issues', v_issues,
    'warnings', v_warnings,
    'stats', jsonb_build_object(
      'team_count', v_team_count,
      'match_count', v_match_count,
      'round1_matches', v_round1_matches,
      'expected_rounds', v_expected_rounds
    )
  );
END;
$$;

-- =====================================================
-- 7. UPDATE advance_match_winner_secure WITH ROW LOCKING
-- =====================================================
-- Add FOR UPDATE to prevent race conditions

CREATE OR REPLACE FUNCTION public.advance_match_winner_secure(
  p_match_id uuid,
  p_winner_id uuid,
  p_loser_id uuid,
  p_tournament_id uuid,
  p_score_team1 integer DEFAULT NULL,
  p_score_team2 integer DEFAULT NULL
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
BEGIN
  -- Lock and fetch the current match to prevent race conditions
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_match_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;
  
  -- Check if match already has a winner (prevent double submission)
  IF v_match.winner_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Match already has a winner',
      'existing_winner', v_match.winner_id
    );
  END IF;
  
  -- Validate winner is one of the teams
  IF p_winner_id != v_match.team1_id AND p_winner_id != v_match.team2_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Winner must be one of the match teams');
  END IF;
  
  -- Get tournament info
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id;
  
  -- Calculate total rounds
  SELECT CEIL(LOG(2, GREATEST(COUNT(*), 2)))::int INTO v_total_rounds
  FROM teams
  WHERE tournament_id = p_tournament_id;
  
  -- Check if this is the final match
  v_is_final := v_match.round_number >= v_total_rounds;
  
  -- Update the current match
  UPDATE matches
  SET 
    winner_id = p_winner_id,
    status = 'completed',
    score_team1 = COALESCE(p_score_team1, score_team1),
    score_team2 = COALESCE(p_score_team2, score_team2),
    completed_at = now(),
    updated_at = now()
  WHERE id = p_match_id;
  
  -- Mark loser as eliminated
  UPDATE teams
  SET status = 'eliminated'
  WHERE id = p_loser_id AND tournament_id = p_tournament_id;
  
  -- If not final, advance winner to next match
  IF NOT v_is_final THEN
    -- Determine which slot the winner goes to based on match number
    v_next_match_number := CEIL(v_match.match_number::numeric / 2);
    v_next_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'team1_id' ELSE 'team2_id' END;
    
    -- Find and lock the next match
    SELECT * INTO v_next_match
    FROM matches
    WHERE tournament_id = p_tournament_id
      AND round_number = v_match.round_number + 1
      AND match_number = v_next_match_number
    FOR UPDATE;
    
    IF FOUND THEN
      -- Update the appropriate slot
      IF v_next_slot = 'team1_id' THEN
        UPDATE matches
        SET team1_id = p_winner_id, updated_at = now()
        WHERE id = v_next_match.id;
      ELSE
        UPDATE matches
        SET team2_id = p_winner_id, updated_at = now()
        WHERE id = v_next_match.id;
      END IF;
      
      -- Check if next match is now ready (both teams assigned)
      SELECT * INTO v_next_match
      FROM matches
      WHERE id = v_next_match.id;
      
      v_next_match_ready := v_next_match.team1_id IS NOT NULL AND v_next_match.team2_id IS NOT NULL;
      
      -- If next match is ready, set it to live
      IF v_next_match_ready THEN
        UPDATE matches
        SET status = 'live', updated_at = now()
        WHERE id = v_next_match.id;
      END IF;
    END IF;
  ELSE
    -- This is the final - mark tournament as completed
    UPDATE tournaments
    SET 
      status = 'completed',
      updated_at = now()
    WHERE id = p_tournament_id;
    
    -- Mark winner team
    UPDATE teams
    SET status = 'winner'
    WHERE id = p_winner_id AND tournament_id = p_tournament_id;
  END IF;
  
  -- Log the advancement
  INSERT INTO audit_logs (action, table_name, record_id, user_id, new_values)
  VALUES (
    'MATCH_RESULT_ADVANCED',
    'matches',
    p_match_id::text,
    auth.uid(),
    jsonb_build_object(
      'winner_id', p_winner_id,
      'loser_id', p_loser_id,
      'score', jsonb_build_object('team1', p_score_team1, 'team2', p_score_team2),
      'is_final', v_is_final,
      'next_match_ready', v_next_match_ready
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'tournament_completed', v_is_final,
    'winner_team_id', CASE WHEN v_is_final THEN p_winner_id ELSE NULL END,
    'next_match_ready', v_next_match_ready,
    'next_match_id', CASE WHEN v_next_match.id IS NOT NULL THEN v_next_match.id ELSE NULL END
  );
END;
$$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.reset_match_secure(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_match_result(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_bracket_secure(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_bracket_generation(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_bracket_structure(uuid) TO authenticated;