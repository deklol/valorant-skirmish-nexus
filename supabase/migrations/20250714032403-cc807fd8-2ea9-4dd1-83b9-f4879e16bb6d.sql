-- PHASE 1: CREATE DATABASE-LEVEL DIAGNOSTIC FUNCTIONS
-- These replace the conflicting JavaScript client-side logic with secure database-level operations

-- Function 1: Diagnose bracket progression issues
CREATE OR REPLACE FUNCTION public.diagnose_bracket_progression(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tournament_rec RECORD;
  match_rec RECORD;
  next_match_rec RECORD;
  issues jsonb := '[]'::jsonb;
  pending_with_teams_count integer := 0;
  completed_without_progression_count integer := 0;
  total_matches integer := 0;
  original_team_count integer;
BEGIN
  -- Get tournament info
  SELECT * INTO tournament_rec FROM tournaments WHERE id = p_tournament_id;
  IF tournament_rec IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Tournament not found',
      'issues', '[]'::jsonb
    );
  END IF;

  -- Get original team count for validation
  SELECT COUNT(*) INTO original_team_count 
  FROM teams 
  WHERE tournament_id = p_tournament_id;

  -- Count total matches
  SELECT COUNT(*) INTO total_matches 
  FROM matches 
  WHERE tournament_id = p_tournament_id;

  -- Issue 1: Matches that should be live but aren't (have both teams but status is pending)
  SELECT COUNT(*) INTO pending_with_teams_count
  FROM matches 
  WHERE tournament_id = p_tournament_id 
    AND status = 'pending'
    AND team1_id IS NOT NULL 
    AND team2_id IS NOT NULL;

  IF pending_with_teams_count > 0 THEN
    issues := issues || jsonb_build_array(
      format('%s matches have both teams but status is still pending - should be live', pending_with_teams_count)
    );
  END IF;

  -- Issue 2: Completed matches without proper progression
  FOR match_rec IN 
    SELECT m.id, m.round_number, m.match_number, m.winner_id
    FROM matches m
    WHERE m.tournament_id = p_tournament_id 
      AND m.status = 'completed'
      AND m.winner_id IS NOT NULL
  LOOP
    -- Calculate next match position
    DECLARE
      next_round integer := match_rec.round_number + 1;
      next_match_number integer := CEIL(match_rec.match_number::decimal / 2);
    BEGIN
      -- Check if winner was advanced to next match
      SELECT * INTO next_match_rec
      FROM matches 
      WHERE tournament_id = p_tournament_id
        AND round_number = next_round
        AND match_number = next_match_number;

      -- If next match exists but winner wasn't advanced
      IF next_match_rec.id IS NOT NULL AND 
         next_match_rec.team1_id != match_rec.winner_id AND 
         next_match_rec.team2_id != match_rec.winner_id THEN
        
        completed_without_progression_count := completed_without_progression_count + 1;
        issues := issues || jsonb_build_array(
          format('R%sM%s winner not advanced to R%sM%s', 
            match_rec.round_number, match_rec.match_number,
            next_round, next_match_number)
        );
      END IF;
    END;
  END LOOP;

  -- Return comprehensive diagnosis
  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'tournament_name', tournament_rec.name,
    'original_team_count', original_team_count,
    'total_matches', total_matches,
    'pending_with_teams', pending_with_teams_count,
    'progression_issues', completed_without_progression_count,
    'issues', issues,
    'is_healthy', jsonb_array_length(issues) = 0
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'issues', '[]'::jsonb
  );
END;
$$;

-- Function 2: Fix all bracket progression issues using existing secure RPC
CREATE OR REPLACE FUNCTION public.fix_all_bracket_progression(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tournament_rec RECORD;
  match_rec RECORD;
  fixes_applied integer := 0;
  errors_found text[] := ARRAY[]::text[];
  advance_result jsonb;
  loser_id uuid;
BEGIN
  -- Get tournament info
  SELECT * INTO tournament_rec FROM tournaments WHERE id = p_tournament_id;
  IF tournament_rec IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Tournament not found',
      'fixes_applied', 0,
      'errors', ARRAY[]::text[]
    );
  END IF;

  -- Process all completed matches that need progression
  FOR match_rec IN 
    SELECT m.*
    FROM matches m
    WHERE m.tournament_id = p_tournament_id 
      AND m.status = 'completed'
      AND m.winner_id IS NOT NULL
    ORDER BY m.round_number, m.match_number
  LOOP
    BEGIN
      -- Determine loser
      IF match_rec.team1_id = match_rec.winner_id THEN
        loser_id := match_rec.team2_id;
      ELSE
        loser_id := match_rec.team1_id;
      END IF;

      -- Use the existing secure advancement function
      SELECT advance_match_winner_secure(
        match_rec.id,
        match_rec.winner_id,
        loser_id,
        p_tournament_id,
        match_rec.score_team1,
        match_rec.score_team2
      ) INTO advance_result;

      -- Check if advancement was successful
      IF (advance_result->>'success')::boolean THEN
        fixes_applied := fixes_applied + 1;
      ELSE
        errors_found := errors_found || ARRAY[
          format('R%sM%s: %s', match_rec.round_number, match_rec.match_number, 
            COALESCE(advance_result->>'error', 'Unknown error'))
        ];
      END IF;

    EXCEPTION WHEN OTHERS THEN
      errors_found := errors_found || ARRAY[
        format('R%sM%s: %s', match_rec.round_number, match_rec.match_number, SQLERRM)
      ];
    END;
  END LOOP;

  -- Update matches that should be live (have both teams but are pending)
  UPDATE matches 
  SET status = 'live'
  WHERE tournament_id = p_tournament_id
    AND status = 'pending'
    AND team1_id IS NOT NULL
    AND team2_id IS NOT NULL;

  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'tournament_name', tournament_rec.name,
    'fixes_applied', fixes_applied,
    'errors', errors_found,
    'matches_set_to_live', COALESCE((SELECT COUNT(*) FROM matches 
      WHERE tournament_id = p_tournament_id AND status = 'live'), 0)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'fixes_applied', fixes_applied,
    'errors', errors_found
  );
END;
$$;

-- Function 3: Validate bracket structure
CREATE OR REPLACE FUNCTION public.validate_bracket_structure(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tournament_rec RECORD;
  original_team_count integer;
  expected_rounds integer;
  actual_rounds integer;
  round_rec RECORD;
  issues jsonb := '[]'::jsonb;
  expected_matches_in_round integer;
  actual_matches_in_round integer;
BEGIN
  -- Get tournament info
  SELECT * INTO tournament_rec FROM tournaments WHERE id = p_tournament_id;
  IF tournament_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Get original team count
  SELECT COUNT(*) INTO original_team_count 
  FROM teams 
  WHERE tournament_id = p_tournament_id;

  -- Calculate expected bracket structure
  expected_rounds := CEIL(LOG(2, original_team_count));
  
  SELECT MAX(round_number) INTO actual_rounds 
  FROM matches 
  WHERE tournament_id = p_tournament_id;

  -- Validate round structure
  IF actual_rounds != expected_rounds THEN
    issues := issues || jsonb_build_array(
      format('Expected %s rounds for %s teams, found %s rounds', 
        expected_rounds, original_team_count, actual_rounds)
    );
  END IF;

  -- Validate each round has correct number of matches
  FOR round_rec IN 
    SELECT round_number, COUNT(*) as match_count
    FROM matches 
    WHERE tournament_id = p_tournament_id
    GROUP BY round_number
    ORDER BY round_number
  LOOP
    expected_matches_in_round := CEIL(original_team_count::decimal / POWER(2, round_rec.round_number));
    
    IF round_rec.match_count != expected_matches_in_round THEN
      issues := issues || jsonb_build_array(
        format('Round %s: expected %s matches, found %s matches',
          round_rec.round_number, expected_matches_in_round, round_rec.match_count)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'original_team_count', original_team_count,
    'expected_rounds', expected_rounds,
    'actual_rounds', actual_rounds,
    'issues', issues,
    'is_valid', jsonb_array_length(issues) = 0
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;