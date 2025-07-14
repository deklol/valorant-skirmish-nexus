-- Standardize side choice to use 'defense' instead of 'defend'

-- First, update any existing 'defend' values to 'defense' in the database
UPDATE map_veto_actions 
SET side_choice = 'defense' 
WHERE side_choice = 'defend';

-- Update the set_side_choice function to use 'defense' consistently
CREATE OR REPLACE FUNCTION public.set_side_choice(p_match_id uuid, p_user_id uuid, p_side_choice text)
RETURNS TEXT 
LANGUAGE plpgsql AS $$
DECLARE
  session_rec RECORD;
  action_rec RECORD;
  normalized_side_choice text;
  home_team_captain boolean := false;
BEGIN
  -- Validate and normalize side choice input
  normalized_side_choice := lower(trim(p_side_choice));
  
  -- Validate side choice value - standardized on 'attack' and 'defense'
  CASE normalized_side_choice
    WHEN 'attack' THEN NULL; -- Valid
    WHEN 'defense' THEN NULL; -- Valid  
    ELSE 
      RETURN 'INVALID_SIDE_CHOICE: Must be attack or defense, got: ' || COALESCE(p_side_choice, 'NULL');
  END CASE;

  -- Get veto session from match_id
  SELECT * INTO session_rec 
  FROM map_veto_sessions 
  WHERE match_id = p_match_id;
  
  IF session_rec IS NULL THEN
    RETURN 'NO_VETO_SESSION: No veto session found for match ' || p_match_id;
  END IF;

  -- Check if session is in correct state
  IF session_rec.status != 'in_progress' THEN
    RETURN 'INVALID_SESSION_STATUS: Session status is ' || COALESCE(session_rec.status::text, 'NULL');
  END IF;

  -- Verify user is captain of home team (only home team chooses side)
  SELECT EXISTS(
    SELECT 1 FROM team_members 
    WHERE team_id = session_rec.home_team_id 
    AND user_id = p_user_id 
    AND is_captain = true
  ) INTO home_team_captain;
  
  IF NOT home_team_captain THEN
    RETURN 'NOT_HOME_CAPTAIN: Only home team captain can choose side';
  END IF;

  -- Find the picked map action to update
  SELECT * INTO action_rec
  FROM map_veto_actions 
  WHERE veto_session_id = session_rec.id 
  AND action = 'pick'
  AND side_choice IS NULL
  ORDER BY order_number ASC
  LIMIT 1;
  
  IF action_rec IS NULL THEN
    RETURN 'NO_PICK_TO_UPDATE: No pick action found that needs side choice';
  END IF;

  -- Update the action with side choice
  UPDATE map_veto_actions 
  SET side_choice = normalized_side_choice
  WHERE id = action_rec.id;

  -- Complete the veto session
  UPDATE map_veto_sessions 
  SET status = 'completed', completed_at = now()
  WHERE id = session_rec.id;

  -- Log the action for debugging
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'map_veto_actions',
    'SET_SIDE_CHOICE',
    action_rec.id,
    p_user_id,
    jsonb_build_object(
      'side_choice', normalized_side_choice,
      'match_id', p_match_id,
      'session_id', session_rec.id,
      'function_name', 'set_side_choice'
    ),
    now()
  );

  RETURN 'OK';

EXCEPTION WHEN OTHERS THEN
  -- Log the exception for debugging
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'map_veto_sessions',
    'ERROR_SET_SIDE_CHOICE',
    session_rec.id,
    p_user_id,
    jsonb_build_object(
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'match_id', p_match_id,
      'side_choice', p_side_choice,
      'function_name', 'set_side_choice'
    ),
    now()
  );
  
  RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Update the choose_veto_side function to use 'defense' consistently
CREATE OR REPLACE FUNCTION public.choose_veto_side(p_match_id uuid, p_user_id uuid, p_side_choice text)
RETURNS jsonb 
LANGUAGE plpgsql AS $$
DECLARE
  session_rec RECORD;
  action_rec RECORD;
  normalized_side_choice text;
  home_team_captain boolean := false;
BEGIN
  -- Validate and normalize side choice input
  normalized_side_choice := lower(trim(p_side_choice));
  
  -- Validate side choice value - standardized on 'attack' and 'defense'
  CASE normalized_side_choice
    WHEN 'attack' THEN NULL; -- Valid
    WHEN 'defense' THEN NULL; -- Valid  
    ELSE 
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INVALID_SIDE_CHOICE: Must be attack or defense, got: ' || COALESCE(p_side_choice, 'NULL')
      );
  END CASE;

  -- Get veto session from match_id
  SELECT * INTO session_rec 
  FROM map_veto_sessions 
  WHERE match_id = p_match_id;
  
  IF session_rec IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_VETO_SESSION: No veto session found for match ' || p_match_id
    );
  END IF;

  -- Check if session is in correct state
  IF session_rec.status != 'in_progress' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_SESSION_STATUS: Session status is ' || COALESCE(session_rec.status::text, 'NULL')
    );
  END IF;

  -- Verify user is captain of home team (only home team chooses side)
  SELECT EXISTS(
    SELECT 1 FROM team_members 
    WHERE team_id = session_rec.home_team_id 
    AND user_id = p_user_id 
    AND is_captain = true
  ) INTO home_team_captain;
  
  IF NOT home_team_captain THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_HOME_CAPTAIN: Only home team captain can choose side'
    );
  END IF;

  -- Find the picked map action to update
  SELECT * INTO action_rec
  FROM map_veto_actions 
  WHERE veto_session_id = session_rec.id 
  AND action = 'pick'
  AND side_choice IS NULL
  ORDER BY order_number ASC
  LIMIT 1;
  
  IF action_rec IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_PICK_TO_UPDATE: No pick action found that needs side choice'
    );
  END IF;

  -- Update the action with side choice
  UPDATE map_veto_actions 
  SET side_choice = normalized_side_choice
  WHERE id = action_rec.id;

  -- Complete the veto session
  UPDATE map_veto_sessions 
  SET status = 'completed', completed_at = now()
  WHERE id = session_rec.id;

  -- Log the action for debugging
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'map_veto_actions',
    'CHOOSE_VETO_SIDE',
    action_rec.id,
    p_user_id,
    jsonb_build_object(
      'side_choice', normalized_side_choice,
      'match_id', p_match_id,
      'session_id', session_rec.id,
      'function_name', 'choose_veto_side'
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'side_choice', normalized_side_choice
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the exception for debugging
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'map_veto_sessions',
    'ERROR_CHOOSE_VETO_SIDE',
    session_rec.id,
    p_user_id,
    jsonb_build_object(
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'match_id', p_match_id,
      'side_choice', p_side_choice,
      'function_name', 'choose_veto_side'
    ),
    now()
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', 'ERROR: ' || SQLERRM
  );
END;
$$;