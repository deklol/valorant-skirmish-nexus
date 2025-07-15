-- Additional Enhanced Bracket Medic Functions

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