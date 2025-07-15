-- Enhanced Bracket Medic Functions for Complete Tournament Control (Fixed)

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
  tournament_id uuid;
  current_round integer;
  target_match RECORD;
BEGIN
  -- Get team info
  SELECT * INTO team_rec FROM teams WHERE id = p_team_id;
  IF team_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found');
  END IF;

  tournament_id := team_rec.tournament_id;

  -- Find current round (highest round where team has a match)
  SELECT COALESCE(MAX(round_number), 1) INTO current_round
  FROM matches 
  WHERE (team1_id = p_team_id OR team2_id = p_team_id)
  AND tournament_id = tournament_id;

  -- Validate target round
  IF p_target_round <= current_round THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target round must be higher than current round');
  END IF;

  -- Create or update matches to advance team
  FOR i IN (current_round + 1)..p_target_round LOOP
    -- Find or create match in target round
    SELECT * INTO target_match 
    FROM matches 
    WHERE tournament_id = tournament_id 
    AND round_number = i
    AND (team1_id IS NULL OR team2_id IS NULL)
    LIMIT 1;

    IF target_match IS NULL THEN
      -- Create new match in round
      INSERT INTO matches (
        tournament_id, round_number, match_number, team1_id, status, notes
      ) VALUES (
        tournament_id, i, 
        (SELECT COALESCE(MAX(match_number), 0) + 1 FROM matches WHERE tournament_id = tournament_id AND round_number = i),
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