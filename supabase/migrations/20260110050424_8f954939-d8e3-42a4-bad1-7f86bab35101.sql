-- =====================================================
-- FORMAT-AWARE MATCH WINNER ADVANCEMENT RPC
-- Handles: Single Elimination, Double Elimination, Swiss, Round Robin
-- =====================================================

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
      v_is_losers := v_bracket_position = 'losers' OR v_match.round_number < 0;
      v_is_grand_final := v_bracket_position = 'grand_final';
      v_is_reset := v_match.notes ILIKE '%reset%';
      
      -- Get max winners round
      SELECT COALESCE(MAX(round_number), 1) INTO v_max_winners_round
      FROM matches 
      WHERE tournament_id = p_tournament_id 
        AND round_number > 0 
        AND bracket_position != 'losers' 
        AND bracket_position != 'grand_final';

      IF v_is_grand_final THEN
        IF v_is_reset THEN
          -- Reset match complete - tournament over
          UPDATE tournaments SET status = 'completed', updated_at = now() WHERE id = p_tournament_id;
          UPDATE teams SET status = 'winner' WHERE id = p_winner_id AND tournament_id = p_tournament_id;
          UPDATE teams SET status = 'eliminated' WHERE id = p_loser_id AND tournament_id = p_tournament_id;
          
          RETURN jsonb_build_object(
            'success', true,
            'tournament_completed', true,
            'winner_team_id', p_winner_id
          );
        ELSE
          -- First grand final
          IF p_winner_id = v_match.team1_id THEN
            -- Winners bracket champ wins - tournament complete
            UPDATE tournaments SET status = 'completed', updated_at = now() WHERE id = p_tournament_id;
            UPDATE teams SET status = 'winner' WHERE id = p_winner_id AND tournament_id = p_tournament_id;
            UPDATE teams SET status = 'eliminated' WHERE id = p_loser_id AND tournament_id = p_tournament_id;
            
            RETURN jsonb_build_object(
              'success', true,
              'tournament_completed', true,
              'winner_team_id', p_winner_id
            );
          ELSE
            -- Losers bracket champ wins - need reset match
            SELECT * INTO v_grand_final
            FROM matches 
            WHERE tournament_id = p_tournament_id 
              AND bracket_position = 'grand_final'
              AND notes ILIKE '%reset%'
            LIMIT 1;
            
            IF FOUND THEN
              UPDATE matches 
              SET team1_id = v_match.team1_id, 
                  team2_id = p_winner_id, 
                  status = 'live',
                  updated_at = now()
              WHERE id = v_grand_final.id;
              
              RETURN jsonb_build_object(
                'success', true,
                'tournament_completed', false,
                'next_match_id', v_grand_final.id,
                'next_match_ready', true
              );
            END IF;
          END IF;
        END IF;
        
      ELSIF v_is_losers THEN
        -- Loser is eliminated (second loss)
        UPDATE teams SET status = 'eliminated' WHERE id = p_loser_id AND tournament_id = p_tournament_id;
        
        -- Winner advances in losers bracket
        v_next_match_number := CEIL(v_match.match_number::numeric / 2);
        v_next_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'team1_id' ELSE 'team2_id' END;
        
        -- Check if advancing to grand final (no more losers matches)
        SELECT * INTO v_next_match
        FROM matches
        WHERE tournament_id = p_tournament_id
          AND (bracket_position = 'losers' OR round_number < 0)
          AND round_number = v_match.round_number - 1
          AND match_number = v_next_match_number
        FOR UPDATE;
        
        IF NOT FOUND THEN
          -- No more losers matches - advance to grand final as team2
          SELECT * INTO v_grand_final
          FROM matches 
          WHERE tournament_id = p_tournament_id 
            AND bracket_position = 'grand_final'
            AND (notes IS NULL OR notes NOT ILIKE '%reset%')
          LIMIT 1;
          
          IF FOUND THEN
            UPDATE matches SET team2_id = p_winner_id, updated_at = now() WHERE id = v_grand_final.id;
            
            SELECT * INTO v_grand_final FROM matches WHERE id = v_grand_final.id;
            v_next_match_ready := v_grand_final.team1_id IS NOT NULL AND v_grand_final.team2_id IS NOT NULL;
            
            IF v_next_match_ready THEN
              UPDATE matches SET status = 'live', updated_at = now() WHERE id = v_grand_final.id;
            END IF;
          END IF;
        ELSE
          -- Normal losers bracket advancement
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
        -- WINNERS BRACKET
        -- Winner advances in winners bracket
        v_next_match_number := CEIL(v_match.match_number::numeric / 2);
        v_next_slot := CASE WHEN v_match.match_number % 2 = 1 THEN 'team1_id' ELSE 'team2_id' END;
        
        -- Check if advancing to grand final
        IF v_match.round_number >= v_max_winners_round THEN
          -- Winners final - advance to grand final as team1
          SELECT * INTO v_grand_final
          FROM matches 
          WHERE tournament_id = p_tournament_id 
            AND bracket_position = 'grand_final'
            AND (notes IS NULL OR notes NOT ILIKE '%reset%')
          LIMIT 1;
          
          IF FOUND THEN
            UPDATE matches SET team1_id = p_winner_id, updated_at = now() WHERE id = v_grand_final.id;
            
            SELECT * INTO v_grand_final FROM matches WHERE id = v_grand_final.id;
            v_next_match_ready := v_grand_final.team1_id IS NOT NULL AND v_grand_final.team2_id IS NOT NULL;
            
            IF v_next_match_ready THEN
              UPDATE matches SET status = 'live', updated_at = now() WHERE id = v_grand_final.id;
            END IF;
          END IF;
        ELSE
          -- Normal winners bracket advancement
          SELECT * INTO v_next_match
          FROM matches
          WHERE tournament_id = p_tournament_id
            AND round_number = v_match.round_number + 1
            AND match_number = v_next_match_number
            AND (bracket_position IS NULL OR bracket_position = 'winners')
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
        END IF;
        
        -- Loser drops to losers bracket
        SELECT * INTO v_losers_match
        FROM matches
        WHERE tournament_id = p_tournament_id
          AND (bracket_position = 'losers' OR round_number < 0)
          AND team1_id IS NULL
        ORDER BY round_number DESC, match_number ASC
        LIMIT 1
        FOR UPDATE;
        
        IF FOUND THEN
          UPDATE matches SET team1_id = p_loser_id, updated_at = now() WHERE id = v_losers_match.id;
          
          SELECT * INTO v_losers_match FROM matches WHERE id = v_losers_match.id;
          IF v_losers_match.team1_id IS NOT NULL AND v_losers_match.team2_id IS NOT NULL THEN
            UPDATE matches SET status = 'live', updated_at = now() WHERE id = v_losers_match.id;
          END IF;
        ELSE
          -- Try team2 slot
          SELECT * INTO v_losers_match
          FROM matches
          WHERE tournament_id = p_tournament_id
            AND (bracket_position = 'losers' OR round_number < 0)
            AND team2_id IS NULL
          ORDER BY round_number DESC, match_number ASC
          LIMIT 1
          FOR UPDATE;
          
          IF FOUND THEN
            UPDATE matches SET team2_id = p_loser_id, updated_at = now() WHERE id = v_losers_match.id;
            
            SELECT * INTO v_losers_match FROM matches WHERE id = v_losers_match.id;
            IF v_losers_match.team1_id IS NOT NULL AND v_losers_match.team2_id IS NOT NULL THEN
              UPDATE matches SET status = 'live', updated_at = now() WHERE id = v_losers_match.id;
            END IF;
          END IF;
        END IF;
      END IF;
    END;

  -- ============================================================================
  -- SWISS FORMAT - No automatic progression, check if round complete
  -- ============================================================================
  ELSIF v_bracket_type = 'swiss' THEN
    -- Check if all matches in current round are complete
    SELECT NOT EXISTS (
      SELECT 1 FROM matches 
      WHERE tournament_id = p_tournament_id 
        AND round_number = v_match.round_number 
        AND status != 'completed'
    ) INTO v_swiss_all_complete;
    
    -- Check if this is the final round
    IF v_swiss_all_complete THEN
      DECLARE
        v_max_round int;
        v_swiss_total_rounds int;
      BEGIN
        SELECT MAX(round_number) INTO v_max_round FROM matches WHERE tournament_id = p_tournament_id;
        v_swiss_total_rounds := COALESCE(v_tournament.swiss_rounds, 5);
        
        IF v_max_round >= v_swiss_total_rounds THEN
          -- All Swiss rounds complete - tournament finished
          UPDATE tournaments SET status = 'completed', updated_at = now() WHERE id = p_tournament_id;
          v_is_final := true;
        END IF;
      END;
    END IF;
    
    -- Return with round completion status (client can trigger next round generation)
    RETURN jsonb_build_object(
      'success', true,
      'tournament_completed', v_is_final,
      'round_completed', v_swiss_all_complete,
      'current_round', v_match.round_number,
      'format', 'swiss'
    );

  -- ============================================================================
  -- ROUND ROBIN - No progression, just check if all matches complete
  -- ============================================================================
  ELSIF v_bracket_type = 'round_robin' THEN
    -- Check if all matches are complete
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
      'score_team1', p_score_team1,
      'score_team2', p_score_team2,
      'bracket_type', v_bracket_type,
      'is_final', v_is_final
    )
  );
  
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.advance_match_winner_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_match_winner_secure TO anon;

-- =====================================================
-- SWISS NEXT ROUND GENERATOR RPC
-- Called after all matches in a Swiss round are complete
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_swiss_next_round(
  p_tournament_id uuid,
  p_current_round integer,
  p_best_of integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_total_rounds int;
  v_team RECORD;
  v_opponent RECORD;
  v_standings jsonb[];
  v_paired_teams text[] := '{}';
  v_new_match_count int := 0;
  v_next_round int;
  v_match_number int := 1;
BEGIN
  -- Get tournament info
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  v_total_rounds := COALESCE(v_tournament.swiss_rounds, 5);
  v_next_round := p_current_round + 1;
  
  -- Check if we've reached max rounds
  IF p_current_round >= v_total_rounds THEN
    RETURN jsonb_build_object('success', true, 'matches_created', 0, 'tournament_complete', true);
  END IF;
  
  -- Check all current round matches are complete
  IF EXISTS (
    SELECT 1 FROM matches 
    WHERE tournament_id = p_tournament_id 
      AND round_number = p_current_round 
      AND status != 'completed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current round not complete');
  END IF;
  
  -- Calculate standings and create pairings
  -- Using a temporary table for standings calculation
  CREATE TEMP TABLE IF NOT EXISTS swiss_standings (
    team_id uuid,
    team_name text,
    wins int DEFAULT 0,
    losses int DEFAULT 0,
    points int DEFAULT 0,
    buchholz int DEFAULT 0,
    opponents_played uuid[] DEFAULT '{}'
  ) ON COMMIT DROP;
  
  DELETE FROM swiss_standings;
  
  -- Initialize standings for all teams
  INSERT INTO swiss_standings (team_id, team_name)
  SELECT t.id, t.name FROM teams t WHERE t.tournament_id = p_tournament_id;
  
  -- Calculate wins/losses from completed matches
  UPDATE swiss_standings s
  SET 
    wins = (
      SELECT COUNT(*) FROM matches m 
      WHERE m.tournament_id = p_tournament_id 
        AND m.status = 'completed' 
        AND m.winner_id = s.team_id
    ),
    losses = (
      SELECT COUNT(*) FROM matches m 
      WHERE m.tournament_id = p_tournament_id 
        AND m.status = 'completed' 
        AND (m.team1_id = s.team_id OR m.team2_id = s.team_id)
        AND m.winner_id != s.team_id
        AND m.winner_id IS NOT NULL
    ),
    opponents_played = (
      SELECT ARRAY_AGG(
        CASE WHEN m.team1_id = s.team_id THEN m.team2_id ELSE m.team1_id END
      )
      FROM matches m
      WHERE m.tournament_id = p_tournament_id
        AND m.status = 'completed'
        AND (m.team1_id = s.team_id OR m.team2_id = s.team_id)
    );
  
  UPDATE swiss_standings SET points = wins * 3;
  
  -- Calculate Buchholz (sum of opponents' points)
  UPDATE swiss_standings s
  SET buchholz = COALESCE((
    SELECT SUM(s2.points) 
    FROM swiss_standings s2 
    WHERE s2.team_id = ANY(s.opponents_played)
  ), 0);
  
  -- Create pairings (pair teams with similar scores who haven't played)
  FOR v_team IN 
    SELECT * FROM swiss_standings ORDER BY points DESC, buchholz DESC
  LOOP
    -- Skip if already paired
    IF v_team.team_id::text = ANY(v_paired_teams) THEN
      CONTINUE;
    END IF;
    
    -- Find best opponent
    FOR v_opponent IN
      SELECT * FROM swiss_standings 
      WHERE team_id != v_team.team_id
        AND team_id::text != ALL(v_paired_teams)
        AND team_id != ALL(COALESCE(v_team.opponents_played, '{}'))
      ORDER BY ABS(points - v_team.points), buchholz DESC
      LIMIT 1
    LOOP
      -- Create match
      INSERT INTO matches (
        tournament_id, round_number, match_number, 
        team1_id, team2_id, status, best_of,
        score_team1, score_team2, bracket_position, notes
      ) VALUES (
        p_tournament_id, v_next_round, v_match_number,
        v_team.team_id, v_opponent.team_id, 'pending', p_best_of,
        0, 0, 'swiss', 'Swiss Round ' || v_next_round || ' of ' || v_total_rounds
      );
      
      v_paired_teams := array_append(v_paired_teams, v_team.team_id::text);
      v_paired_teams := array_append(v_paired_teams, v_opponent.team_id::text);
      v_new_match_count := v_new_match_count + 1;
      v_match_number := v_match_number + 1;
    END LOOP;
  END LOOP;
  
  -- Handle bye for odd number of unpaired teams
  FOR v_team IN
    SELECT * FROM swiss_standings 
    WHERE team_id::text != ALL(v_paired_teams)
  LOOP
    INSERT INTO matches (
      tournament_id, round_number, match_number,
      team1_id, team2_id, status, best_of,
      score_team1, score_team2, winner_id, bracket_position, notes
    ) VALUES (
      p_tournament_id, v_next_round, v_match_number,
      v_team.team_id, NULL, 'completed', p_best_of,
      1, 0, v_team.team_id, 'swiss', 'Bye'
    );
    v_new_match_count := v_new_match_count + 1;
  END LOOP;
  
  DROP TABLE IF EXISTS swiss_standings;
  
  RETURN jsonb_build_object(
    'success', true,
    'matches_created', v_new_match_count,
    'next_round', v_next_round,
    'tournament_complete', false
  );
  
EXCEPTION WHEN OTHERS THEN
  DROP TABLE IF EXISTS swiss_standings;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_swiss_next_round TO authenticated;