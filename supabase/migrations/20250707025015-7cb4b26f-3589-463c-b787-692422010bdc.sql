-- Phase 1: Fresh Veto System Database Functions
-- Clean, simplified approach with robust error handling

-- Function to roll dice and determine home/away teams for veto
CREATE OR REPLACE FUNCTION public.roll_veto_dice(p_match_id uuid, p_initiator_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  match_rec RECORD;
  tournament_rec RECORD;
  session_rec RECORD;
  roll_seed TEXT;
  home_team_id uuid;
  away_team_id uuid;
  dice_result INTEGER;
  user_team_id uuid;
BEGIN
  -- Get match and tournament info
  SELECT * INTO match_rec FROM matches WHERE id = p_match_id;
  IF match_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;
  
  SELECT * INTO tournament_rec FROM tournaments WHERE id = match_rec.tournament_id;
  IF tournament_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  -- Verify user is on one of the teams (solo tournament logic - any member can roll)
  SELECT team_id INTO user_team_id 
  FROM team_members 
  WHERE user_id = p_initiator_user_id 
    AND team_id IN (match_rec.team1_id, match_rec.team2_id);
    
  IF user_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not on participating team');
  END IF;
  
  -- Check if session already exists
  SELECT * INTO session_rec FROM map_veto_sessions WHERE match_id = p_match_id;
  IF session_rec IS NOT NULL AND session_rec.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Veto already in progress or completed');
  END IF;
  
  -- Generate random seed and dice result
  roll_seed := gen_random_uuid()::text;
  dice_result := (abs(hashtext(roll_seed)) % 6) + 1; -- 1-6 dice roll
  
  -- Determine home/away based on dice result and team order
  -- Even numbers: team1 is home, Odd numbers: team2 is home
  IF dice_result % 2 = 0 THEN
    home_team_id := match_rec.team1_id;
    away_team_id := match_rec.team2_id;
  ELSE
    home_team_id := match_rec.team2_id;
    away_team_id := match_rec.team1_id;
  END IF;
  
  -- Create or update veto session
  INSERT INTO map_veto_sessions (
    match_id,
    home_team_id,
    away_team_id,
    roll_seed,
    roll_initiator_id,
    roll_timestamp,
    status,
    current_turn_team_id,
    started_at
  ) VALUES (
    p_match_id,
    home_team_id,
    away_team_id,
    roll_seed,
    p_initiator_user_id,
    now(),
    'in_progress',
    home_team_id, -- Home team starts first
    now()
  )
  ON CONFLICT (match_id) 
  DO UPDATE SET
    home_team_id = EXCLUDED.home_team_id,
    away_team_id = EXCLUDED.away_team_id,
    roll_seed = EXCLUDED.roll_seed,
    roll_initiator_id = EXCLUDED.roll_initiator_id,
    roll_timestamp = EXCLUDED.roll_timestamp,
    status = EXCLUDED.status,
    current_turn_team_id = EXCLUDED.current_turn_team_id,
    started_at = EXCLUDED.started_at;
  
  RETURN jsonb_build_object(
    'success', true,
    'dice_result', dice_result,
    'home_team_id', home_team_id,
    'away_team_id', away_team_id,
    'current_turn', home_team_id,
    'roll_seed', roll_seed
  );
END;
$$;

-- Function to perform veto ban action
CREATE OR REPLACE FUNCTION public.perform_veto_ban(
  p_match_id uuid, 
  p_user_id uuid, 
  p_map_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  session_rec RECORD;
  match_rec RECORD;
  tournament_rec RECORD;
  user_team_id uuid;
  ban_count INTEGER;
  total_maps INTEGER;
  next_turn_team_id uuid;
  action_order INTEGER;
BEGIN
  -- Get session
  SELECT * INTO session_rec FROM map_veto_sessions WHERE match_id = p_match_id;
  IF session_rec IS NULL OR session_rec.status != 'in_progress' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active veto session');
  END IF;
  
  -- Get match and tournament
  SELECT * INTO match_rec FROM matches WHERE id = p_match_id;
  SELECT * INTO tournament_rec FROM tournaments WHERE id = match_rec.tournament_id;
  
  -- Verify user is on current turn team
  SELECT team_id INTO user_team_id 
  FROM team_members 
  WHERE user_id = p_user_id 
    AND team_id = session_rec.current_turn_team_id;
    
  IF user_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not your turn');
  END IF;
  
  -- Verify map is in tournament pool and not already banned
  IF NOT (p_map_id::text = ANY(SELECT jsonb_array_elements_text(tournament_rec.map_pool))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Map not in tournament pool');
  END IF;
  
  IF EXISTS (SELECT 1 FROM map_veto_actions WHERE veto_session_id = session_rec.id AND map_id = p_map_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Map already banned');
  END IF;
  
  -- Calculate current state
  SELECT COUNT(*) INTO ban_count 
  FROM map_veto_actions 
  WHERE veto_session_id = session_rec.id AND action = 'ban';
  
  total_maps := jsonb_array_length(tournament_rec.map_pool);
  action_order := ban_count + 1;
  
  -- Insert ban action
  INSERT INTO map_veto_actions (
    veto_session_id,
    team_id,
    map_id,
    action,
    order_number,
    performed_by,
    performed_at
  ) VALUES (
    session_rec.id,
    user_team_id,
    p_map_id,
    'ban',
    action_order,
    p_user_id,
    now()
  );
  
  -- Check if this is the final ban (1 map remaining)
  IF ban_count + 1 >= total_maps - 1 THEN
    -- Auto-pick the remaining map
    INSERT INTO map_veto_actions (
      veto_session_id,
      team_id,
      map_id,
      action,
      order_number,
      performed_by,
      performed_at
    )
    SELECT 
      session_rec.id,
      NULL, -- System pick
      m.id,
      'pick',
      action_order + 1,
      NULL,
      now()
    FROM maps m
    WHERE m.id::text = ANY(SELECT jsonb_array_elements_text(tournament_rec.map_pool))
      AND m.id NOT IN (SELECT map_id FROM map_veto_actions WHERE veto_session_id = session_rec.id)
    LIMIT 1;
    
    -- Move to side choice phase - home team chooses
    UPDATE map_veto_sessions 
    SET current_turn_team_id = session_rec.home_team_id
    WHERE id = session_rec.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'phase', 'side_choice',
      'next_turn', session_rec.home_team_id
    );
  ELSE
    -- Switch turns
    IF session_rec.current_turn_team_id = session_rec.home_team_id THEN
      next_turn_team_id := session_rec.away_team_id;
    ELSE
      next_turn_team_id := session_rec.home_team_id;
    END IF;
    
    UPDATE map_veto_sessions 
    SET current_turn_team_id = next_turn_team_id
    WHERE id = session_rec.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'phase', 'banning',
      'next_turn', next_turn_team_id,
      'bans_remaining', total_maps - 1 - (ban_count + 1)
    );
  END IF;
END;
$$;

-- Function to choose side (Attack/Defense)
CREATE OR REPLACE FUNCTION public.choose_veto_side(
  p_match_id uuid,
  p_user_id uuid, 
  p_side_choice text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  session_rec RECORD;
  user_team_id uuid;
BEGIN
  -- Get session
  SELECT * INTO session_rec FROM map_veto_sessions WHERE match_id = p_match_id;
  IF session_rec IS NULL OR session_rec.status != 'in_progress' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active veto session');
  END IF;
  
  -- Verify user is on home team (only home team chooses side)
  SELECT team_id INTO user_team_id 
  FROM team_members 
  WHERE user_id = p_user_id 
    AND team_id = session_rec.home_team_id;
    
  IF user_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only home team can choose side');
  END IF;
  
  -- Validate side choice
  IF p_side_choice NOT IN ('Attack', 'Defense') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid side choice');
  END IF;
  
  -- Update the pick action with side choice
  UPDATE map_veto_actions 
  SET side_choice = p_side_choice
  WHERE veto_session_id = session_rec.id 
    AND action = 'pick';
  
  -- Complete the veto session
  UPDATE map_veto_sessions 
  SET 
    status = 'completed',
    completed_at = now()
  WHERE id = session_rec.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'side_choice', p_side_choice,
    'status', 'completed'
  );
END;
$$;