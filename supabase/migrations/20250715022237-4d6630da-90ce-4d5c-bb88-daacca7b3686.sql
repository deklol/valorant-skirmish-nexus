-- Enhanced Bracket Medic Functions for Complete Tournament Control

-- Function 1: Force advance a specific team to next round
CREATE OR REPLACE FUNCTION public.force_advance_team(
  p_team_id uuid,
  p_target_round integer,
  p_reason text DEFAULT 'Manual admin advancement'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_rec RECORD;
  tournament_rec RECORD;
  current_round integer;
  target_match RECORD;
  result_summary jsonb;
BEGIN
  -- Get team and tournament info
  SELECT t.*, tour.* INTO team_rec, tournament_rec
  FROM teams t
  JOIN tournaments tour ON t.tournament_id = tour.id
  WHERE t.id = p_team_id;
  
  IF team_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found');
  END IF;

  -- Find current round (highest round where team has a match)
  SELECT COALESCE(MAX(round_number), 1) INTO current_round
  FROM matches 
  WHERE (team1_id = p_team_id OR team2_id = p_team_id)
  AND tournament_id = team_rec.tournament_id;

  -- Validate target round
  IF p_target_round <= current_round THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target round must be higher than current round');
  END IF;

  -- Create or update matches to advance team
  FOR i IN (current_round + 1)..p_target_round LOOP
    -- Find or create match in target round
    SELECT * INTO target_match 
    FROM matches 
    WHERE tournament_id = team_rec.tournament_id 
    AND round_number = i
    AND (team1_id IS NULL OR team2_id IS NULL)
    LIMIT 1;

    IF target_match IS NULL THEN
      -- Create new match in round
      INSERT INTO matches (
        tournament_id, round_number, match_number, team1_id, status, notes
      ) VALUES (
        team_rec.tournament_id, i, 
        (SELECT COALESCE(MAX(match_number), 0) + 1 FROM matches WHERE tournament_id = team_rec.tournament_id AND round_number = i),
        p_team_id, 'pending', 'Team advanced by admin: ' || p_reason
      );
    ELSE
      -- Add team to existing match
      IF target_match.team1_id IS NULL THEN
        UPDATE matches SET team1_id = p_team_id, notes = COALESCE(notes, '') || ' | Team manually advanced: ' || p_reason
        WHERE id = target_match.id;
      ELSE
        UPDATE matches SET team2_id = p_team_id, notes = COALESCE(notes, '') || ' | Team manually advanced: ' || p_reason
        WHERE id = target_match.id;
      END IF;
    END IF;
  END LOOP;

  -- Update team status
  UPDATE teams SET status = 'active'::team_status WHERE id = p_team_id;

  -- Log the action
  INSERT INTO audit_logs (table_name, action, record_id, user_id, new_values, created_at)
  VALUES (
    'teams', 'FORCE_ADVANCE', p_team_id, auth.uid(),
    jsonb_build_object(
      'team_name', team_rec.name,
      'from_round', current_round,
      'to_round', p_target_round,
      'reason', p_reason
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'team_name', team_rec.name,
    'advanced_from_round', current_round,
    'advanced_to_round', p_target_round,
    'reason', p_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function 2: Reverse team progression (undo advancement)
CREATE OR REPLACE FUNCTION public.reverse_team_progression(
  p_team_id uuid,
  p_target_round integer,
  p_reason text DEFAULT 'Manual admin reversal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_rec RECORD;
  current_round integer;
  matches_affected integer := 0;
BEGIN
  -- Get team info
  SELECT * INTO team_rec FROM teams WHERE id = p_team_id;
  IF team_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found');
  END IF;

  -- Find current highest round
  SELECT COALESCE(MAX(round_number), 1) INTO current_round
  FROM matches 
  WHERE (team1_id = p_team_id OR team2_id = p_team_id)
  AND tournament_id = team_rec.tournament_id;

  -- Validate target round
  IF p_target_round >= current_round THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target round must be lower than current round');
  END IF;

  -- Remove team from future rounds and reset match results
  UPDATE matches SET
    team1_id = CASE WHEN team1_id = p_team_id THEN NULL ELSE team1_id END,
    team2_id = CASE WHEN team2_id = p_team_id THEN NULL ELSE team2_id END,
    winner_id = CASE WHEN winner_id = p_team_id THEN NULL ELSE winner_id END,
    status = CASE WHEN winner_id = p_team_id THEN 'pending'::match_status ELSE status END,
    completed_at = CASE WHEN winner_id = p_team_id THEN NULL ELSE completed_at END,
    notes = COALESCE(notes, '') || ' | Team progression reversed: ' || p_reason
  WHERE (team1_id = p_team_id OR team2_id = p_team_id OR winner_id = p_team_id)
  AND round_number > p_target_round
  AND tournament_id = team_rec.tournament_id;

  GET DIAGNOSTICS matches_affected = ROW_COUNT;

  -- Log the action
  INSERT INTO audit_logs (table_name, action, record_id, user_id, new_values, created_at)
  VALUES (
    'teams', 'REVERSE_PROGRESSION', p_team_id, auth.uid(),
    jsonb_build_object(
      'team_name', team_rec.name,
      'from_round', current_round,
      'to_round', p_target_round,
      'matches_affected', matches_affected,
      'reason', p_reason
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'team_name', team_rec.name,
    'reversed_from_round', current_round,
    'reversed_to_round', p_target_round,
    'matches_affected', matches_affected
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function 3: Manual winner assignment with stat updates
CREATE OR REPLACE FUNCTION public.set_manual_winner(
  p_match_id uuid,
  p_winner_team_id uuid,
  p_score_team1 integer DEFAULT 1,
  p_score_team2 integer DEFAULT 0,
  p_reason text DEFAULT 'Manual admin decision'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_rec RECORD;
  winner_team RECORD;
  loser_team_id uuid;
  member_record RECORD;
BEGIN
  -- Get match info
  SELECT * INTO match_rec FROM matches WHERE id = p_match_id;
  IF match_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  -- Validate winner is in the match
  IF p_winner_team_id NOT IN (match_rec.team1_id, match_rec.team2_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Winner team not in this match');
  END IF;

  -- Get winner team info
  SELECT * INTO winner_team FROM teams WHERE id = p_winner_team_id;
  
  -- Determine loser
  IF match_rec.team1_id = p_winner_team_id THEN
    loser_team_id := match_rec.team2_id;
  ELSE
    loser_team_id := match_rec.team1_id;
  END IF;

  -- Update match with manual result
  UPDATE matches SET
    winner_id = p_winner_team_id,
    score_team1 = p_score_team1,
    score_team2 = p_score_team2,
    status = 'completed'::match_status,
    completed_at = now(),
    notes = COALESCE(notes, '') || ' | Manual winner set: ' || p_reason
  WHERE id = p_match_id;

  -- Update team member statistics if this was a new completion
  IF match_rec.status != 'completed' OR match_rec.winner_id IS NULL THEN
    -- Increment wins for winning team members
    FOR member_record IN 
      SELECT user_id FROM team_members WHERE team_id = p_winner_team_id
    LOOP
      UPDATE users SET wins = COALESCE(wins, 0) + 1 WHERE id = member_record.user_id;
    END LOOP;
    
    -- Increment losses for losing team members  
    IF loser_team_id IS NOT NULL THEN
      FOR member_record IN 
        SELECT user_id FROM team_members WHERE team_id = loser_team_id
      LOOP
        UPDATE users SET losses = COALESCE(losses, 0) + 1 WHERE id = member_record.user_id;
      END LOOP;
    END IF;
  END IF;

  -- Log the action
  INSERT INTO audit_logs (table_name, action, record_id, user_id, new_values, created_at)
  VALUES (
    'matches', 'MANUAL_WINNER', p_match_id, auth.uid(),
    jsonb_build_object(
      'winner_team', winner_team.name,
      'match_round', match_rec.round_number,
      'match_number', match_rec.match_number,
      'score', p_score_team1 || '-' || p_score_team2,
      'reason', p_reason
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'winner_team', winner_team.name,
    'final_score', p_score_team1 || '-' || p_score_team2,
    'reason', p_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function 4: Deep bracket validation and repair
CREATE OR REPLACE FUNCTION public.validate_and_repair_bracket(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tournament_rec RECORD;
  issues_found integer := 0;
  repairs_made integer := 0;
  validation_report jsonb := '[]'::jsonb;
  temp_report jsonb;
BEGIN
  -- Get tournament info
  SELECT * INTO tournament_rec FROM tournaments WHERE id = p_tournament_id;
  IF tournament_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Check 1: Matches with missing teams
  WITH missing_teams AS (
    SELECT id, round_number, match_number
    FROM matches 
    WHERE tournament_id = p_tournament_id
    AND status = 'completed'
    AND (team1_id IS NULL OR team2_id IS NULL)
  )
  SELECT count(*) INTO issues_found FROM missing_teams;
  
  IF issues_found > 0 THEN
    temp_report := jsonb_build_object(
      'issue', 'Completed matches with missing teams',
      'count', issues_found,
      'severity', 'high'
    );
    validation_report := validation_report || temp_report;
    
    -- Repair: Reset these matches to pending
    UPDATE matches SET 
      status = 'pending'::match_status,
      winner_id = NULL,
      completed_at = NULL,
      notes = COALESCE(notes, '') || ' | Auto-repaired: Missing teams reset to pending'
    WHERE tournament_id = p_tournament_id
    AND status = 'completed'
    AND (team1_id IS NULL OR team2_id IS NULL);
    
    GET DIAGNOSTICS repairs_made = ROW_COUNT;
  END IF;

  -- Check 2: Winners not in their own matches
  WITH invalid_winners AS (
    SELECT id, winner_id, team1_id, team2_id
    FROM matches
    WHERE tournament_id = p_tournament_id
    AND winner_id IS NOT NULL
    AND winner_id NOT IN (team1_id, team2_id)
  )
  SELECT count(*) INTO issues_found FROM invalid_winners;
  
  IF issues_found > 0 THEN
    temp_report := jsonb_build_object(
      'issue', 'Invalid winners (not in match)',
      'count', issues_found,
      'severity', 'critical'
    );
    validation_report := validation_report || temp_report;
    
    -- Repair: Clear invalid winners
    UPDATE matches SET 
      winner_id = NULL,
      status = 'pending'::match_status,
      completed_at = NULL,
      notes = COALESCE(notes, '') || ' | Auto-repaired: Invalid winner cleared'
    WHERE tournament_id = p_tournament_id
    AND winner_id IS NOT NULL
    AND winner_id NOT IN (team1_id, team2_id);
    
    repairs_made := repairs_made + ROW_COUNT;
  END IF;

  -- Check 3: Team status inconsistencies
  WITH status_issues AS (
    SELECT t.id, t.name, t.status
    FROM teams t
    LEFT JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id) AND m.tournament_id = t.tournament_id
    WHERE t.tournament_id = p_tournament_id
    AND t.status = 'eliminated'
    AND EXISTS (
      SELECT 1 FROM matches 
      WHERE (team1_id = t.id OR team2_id = t.id)
      AND status = 'pending'
      AND tournament_id = t.tournament_id
    )
  )
  SELECT count(*) INTO issues_found FROM status_issues;
  
  IF issues_found > 0 THEN
    temp_report := jsonb_build_object(
      'issue', 'Eliminated teams with pending matches',
      'count', issues_found,
      'severity', 'medium'
    );
    validation_report := validation_report || temp_report;
    
    -- Repair: Set teams back to active if they have pending matches
    UPDATE teams SET 
      status = 'active'::team_status,
      updated_at = now()
    WHERE tournament_id = p_tournament_id
    AND status = 'eliminated'
    AND EXISTS (
      SELECT 1 FROM matches 
      WHERE (team1_id = teams.id OR team2_id = teams.id)
      AND status = 'pending'
      AND tournament_id = p_tournament_id
    );
    
    repairs_made := repairs_made + ROW_COUNT;
  END IF;

  -- Log the validation/repair
  INSERT INTO audit_logs (table_name, action, record_id, user_id, new_values, created_at)
  VALUES (
    'tournaments', 'BRACKET_VALIDATION', p_tournament_id, auth.uid(),
    jsonb_build_object(
      'tournament_name', tournament_rec.name,
      'issues_found', jsonb_array_length(validation_report),
      'repairs_made', repairs_made,
      'validation_report', validation_report
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'tournament_name', tournament_rec.name,
    'issues_found', jsonb_array_length(validation_report),
    'repairs_made', repairs_made,
    'validation_report', validation_report
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function 5: Emergency tournament rollback
CREATE OR REPLACE FUNCTION public.rollback_tournament_to_round(
  p_tournament_id uuid,
  p_target_round integer,
  p_reason text DEFAULT 'Emergency rollback'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tournament_rec RECORD;
  matches_reset integer := 0;
  teams_restored integer := 0;
BEGIN
  -- Get tournament info  
  SELECT * INTO tournament_rec FROM tournaments WHERE id = p_tournament_id;
  IF tournament_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Safety check
  IF p_target_round < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target round must be at least 1');
  END IF;

  -- Reset all matches beyond target round
  UPDATE matches SET
    status = 'pending'::match_status,
    winner_id = NULL,
    score_team1 = 0,
    score_team2 = 0,
    completed_at = NULL,
    started_at = NULL,
    notes = COALESCE(notes, '') || ' | Rolled back by admin: ' || p_reason
  WHERE tournament_id = p_tournament_id
  AND round_number > p_target_round;
  
  GET DIAGNOSTICS matches_reset = ROW_COUNT;

  -- Restore eliminated teams that should still be active
  UPDATE teams SET
    status = 'active'::team_status,
    updated_at = now()
  WHERE tournament_id = p_tournament_id
  AND status = 'eliminated'
  AND NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE (m.team1_id = teams.id OR m.team2_id = teams.id)
    AND m.status = 'completed'
    AND m.winner_id != teams.id
    AND m.round_number <= p_target_round
    AND m.tournament_id = p_tournament_id
  );
  
  GET DIAGNOSTICS teams_restored = ROW_COUNT;

  -- Log the rollback
  INSERT INTO audit_logs (table_name, action, record_id, user_id, new_values, created_at)
  VALUES (
    'tournaments', 'EMERGENCY_ROLLBACK', p_tournament_id, auth.uid(),
    jsonb_build_object(
      'tournament_name', tournament_rec.name,
      'target_round', p_target_round,
      'matches_reset', matches_reset,
      'teams_restored', teams_restored,
      'reason', p_reason
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'tournament_name', tournament_rec.name,
    'target_round', p_target_round,
    'matches_reset', matches_reset,
    'teams_restored', teams_restored,
    'reason', p_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;