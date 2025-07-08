-- Fix veto system to work with solo tournament teams (not persistent teams)
-- Update roll_veto_dice function to work correctly with solo tournament team structure

CREATE OR REPLACE FUNCTION public.roll_veto_dice(p_match_id uuid, p_initiator_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Update perform_veto_ban function to use correct team structure
CREATE OR REPLACE FUNCTION public.perform_veto_ban(p_match_id uuid, p_user_id uuid, p_map_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  session_rec RECORD;
  match_rec RECORD;
  tournament_rec RECORD;
  user_team_id uuid;
  result TEXT;
BEGIN
  -- Get the veto session
  SELECT * INTO session_rec 
  FROM map_veto_sessions 
  WHERE match_id = p_match_id;
  
  IF session_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No veto session found');
  END IF;
  
  -- Get match info
  SELECT * INTO match_rec FROM matches WHERE id = p_match_id;
  IF match_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;
  
  -- Verify user is on one of the teams
  SELECT team_id INTO user_team_id 
  FROM team_members 
  WHERE user_id = p_user_id 
    AND team_id IN (match_rec.team1_id, match_rec.team2_id);
    
  IF user_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not on participating team');
  END IF;
  
  -- Perform the veto action
  SELECT perform_veto_action(session_rec.id, p_user_id, user_team_id, p_map_id) INTO result;
  
  IF result = 'OK' THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', result);
  END IF;
END;
$function$;

-- Update choose_veto_side function to use correct team structure
CREATE OR REPLACE FUNCTION public.choose_veto_side(p_match_id uuid, p_user_id uuid, p_side_choice text)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  session_rec RECORD;
  match_rec RECORD;
  user_team_id uuid;
  picked_map_action_id uuid;
BEGIN
  -- Get the veto session
  SELECT * INTO session_rec 
  FROM map_veto_sessions 
  WHERE match_id = p_match_id;
  
  IF session_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No veto session found');
  END IF;
  
  -- Get match info
  SELECT * INTO match_rec FROM matches WHERE id = p_match_id;
  IF match_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;
  
  -- Verify user is on the home team (only home team chooses side)
  SELECT team_id INTO user_team_id 
  FROM team_members 
  WHERE user_id = p_user_id 
    AND team_id = session_rec.home_team_id;
    
  IF user_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only home team can choose side');
  END IF;
  
  -- Find the picked map action
  SELECT id INTO picked_map_action_id
  FROM map_veto_actions
  WHERE veto_session_id = session_rec.id 
    AND action = 'pick'
  LIMIT 1;
  
  IF picked_map_action_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No map has been picked yet');
  END IF;
  
  -- Update the side choice
  UPDATE map_veto_actions
  SET side_choice = p_side_choice
  WHERE id = picked_map_action_id;
  
  -- Mark session as completed
  UPDATE map_veto_sessions
  SET status = 'completed',
      completed_at = now()
  WHERE id = session_rec.id;
  
  RETURN jsonb_build_object('success', true, 'side_choice', p_side_choice);
END;
$function$;

-- Update is_user_on_team function to work with solo tournament teams
CREATE OR REPLACE FUNCTION public.is_user_on_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
AS $function$
  SELECT EXISTS (
    -- Check if user is a member of the team (solo tournament team)
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
  );
$function$;