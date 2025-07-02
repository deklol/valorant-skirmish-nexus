-- Add new team statuses for withdrawals and disqualifications
ALTER TYPE team_status ADD VALUE IF NOT EXISTS 'disqualified';
ALTER TYPE team_status ADD VALUE IF NOT EXISTS 'withdrawn';
ALTER TYPE team_status ADD VALUE IF NOT EXISTS 'forfeited';

-- Function to disqualify a team and handle bracket progression
CREATE OR REPLACE FUNCTION public.disqualify_team(
  p_team_id uuid,
  p_reason text DEFAULT 'Disqualified by admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_rec RECORD;
  match_rec RECORD;
  opponent_team_id uuid;
  result_summary jsonb := '{"matches_forfeited": 0, "opponents_advanced": 0}'::jsonb;
  match_count integer := 0;
  advancement_count integer := 0;
BEGIN
  -- Get team info
  SELECT * INTO team_rec FROM teams WHERE id = p_team_id;
  IF team_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found');
  END IF;

  -- Update team status
  UPDATE teams 
  SET status = 'disqualified'::team_status,
      updated_at = now()
  WHERE id = p_team_id;

  -- Handle all pending and live matches for this team
  FOR match_rec IN 
    SELECT * FROM matches 
    WHERE (team1_id = p_team_id OR team2_id = p_team_id)
    AND status IN ('pending', 'live')
    AND tournament_id = team_rec.tournament_id
  LOOP
    match_count := match_count + 1;
    
    -- Determine opponent
    IF match_rec.team1_id = p_team_id THEN
      opponent_team_id := match_rec.team2_id;
    ELSE 
      opponent_team_id := match_rec.team1_id;
    END IF;

    -- If there's an opponent, give them the win
    IF opponent_team_id IS NOT NULL THEN
      UPDATE matches SET
        status = 'completed'::match_status,
        winner_id = opponent_team_id,
        completed_at = now(),
        notes = COALESCE(notes, '') || ' | Team ' || team_rec.name || ' disqualified: ' || p_reason
      WHERE id = match_rec.id;
      
      advancement_count := advancement_count + 1;
    ELSE
      -- No opponent, just mark as completed with no winner
      UPDATE matches SET
        status = 'completed'::match_status,
        completed_at = now(),
        notes = COALESCE(notes, '') || ' | Team ' || team_rec.name || ' disqualified: ' || p_reason
      WHERE id = match_rec.id;
    END IF;
  END LOOP;

  -- Log the action
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'teams',
    'DISQUALIFY',
    p_team_id,
    auth.uid(),
    jsonb_build_object(
      'team_name', team_rec.name,
      'reason', p_reason,
      'matches_affected', match_count,
      'opponents_advanced', advancement_count
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'team_name', team_rec.name,
    'matches_forfeited', match_count,
    'opponents_advanced', advancement_count,
    'reason', p_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Function to withdraw a team (similar to DQ but different status)
CREATE OR REPLACE FUNCTION public.withdraw_team(
  p_team_id uuid,
  p_reason text DEFAULT 'Team withdrew from tournament'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_rec RECORD;
  match_rec RECORD;
  opponent_team_id uuid;
  match_count integer := 0;
  advancement_count integer := 0;
BEGIN
  -- Get team info
  SELECT * INTO team_rec FROM teams WHERE id = p_team_id;
  IF team_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found');
  END IF;

  -- Update team status
  UPDATE teams 
  SET status = 'withdrawn'::team_status,
      updated_at = now()
  WHERE id = p_team_id;

  -- Handle all future matches for this team (don't change completed ones)
  FOR match_rec IN 
    SELECT * FROM matches 
    WHERE (team1_id = p_team_id OR team2_id = p_team_id)
    AND status IN ('pending', 'live')
    AND tournament_id = team_rec.tournament_id
  LOOP
    match_count := match_count + 1;
    
    -- Determine opponent
    IF match_rec.team1_id = p_team_id THEN
      opponent_team_id := match_rec.team2_id;
    ELSE 
      opponent_team_id := match_rec.team1_id;
    END IF;

    -- If there's an opponent, give them the win
    IF opponent_team_id IS NOT NULL THEN
      UPDATE matches SET
        status = 'completed'::match_status,
        winner_id = opponent_team_id,
        completed_at = now(),
        notes = COALESCE(notes, '') || ' | Team ' || team_rec.name || ' withdrew: ' || p_reason
      WHERE id = match_rec.id;
      
      advancement_count := advancement_count + 1;
    ELSE
      -- No opponent, just mark as completed with no winner
      UPDATE matches SET
        status = 'completed'::match_status,
        completed_at = now(),
        notes = COALESCE(notes, '') || ' | Team ' || team_rec.name || ' withdrew: ' || p_reason
      WHERE id = match_rec.id;
    END IF;
  END LOOP;

  -- Log the action
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'teams',
    'WITHDRAW',
    p_team_id,
    auth.uid(),
    jsonb_build_object(
      'team_name', team_rec.name,
      'reason', p_reason,
      'matches_affected', match_count,
      'opponents_advanced', advancement_count
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'team_name', team_rec.name,
    'matches_forfeited', match_count,
    'opponents_advanced', advancement_count,
    'reason', p_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Function to manually advance a team to next round
CREATE OR REPLACE FUNCTION public.manually_advance_team(
  p_team_id uuid,
  p_to_round integer,
  p_to_match_number integer,
  p_reason text DEFAULT 'Manual advancement by admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_rec RECORD;
  target_match_rec RECORD;
  slot_to_fill text;
BEGIN
  -- Get team info
  SELECT * INTO team_rec FROM teams WHERE id = p_team_id;
  IF team_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found');
  END IF;

  -- Find target match
  SELECT * INTO target_match_rec 
  FROM matches 
  WHERE tournament_id = team_rec.tournament_id
  AND round_number = p_to_round
  AND match_number = p_to_match_number;

  IF target_match_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target match not found');
  END IF;

  -- Determine which slot to fill (prefer empty slot)
  IF target_match_rec.team1_id IS NULL THEN
    slot_to_fill := 'team1_id';
  ELSIF target_match_rec.team2_id IS NULL THEN
    slot_to_fill := 'team2_id';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Target match already has both teams');
  END IF;

  -- Update the match
  IF slot_to_fill = 'team1_id' THEN
    UPDATE matches SET 
      team1_id = p_team_id,
      notes = COALESCE(notes, '') || ' | Team ' || team_rec.name || ' manually advanced: ' || p_reason
    WHERE id = target_match_rec.id;
  ELSE
    UPDATE matches SET 
      team2_id = p_team_id,
      notes = COALESCE(notes, '') || ' | Team ' || team_rec.name || ' manually advanced: ' || p_reason
    WHERE id = target_match_rec.id;
  END IF;

  -- Log the action
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'matches',
    'MANUAL_ADVANCE',
    target_match_rec.id,
    auth.uid(),
    jsonb_build_object(
      'team_name', team_rec.name,
      'to_round', p_to_round,
      'to_match', p_to_match_number,
      'slot_filled', slot_to_fill,
      'reason', p_reason
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'team_name', team_rec.name,
    'advanced_to', 'Round ' || p_to_round || ', Match ' || p_to_match_number,
    'slot_filled', slot_to_fill,
    'reason', p_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;