-- Comprehensive fix for side_choice data inconsistency causing "case not found" errors
-- This ensures all side_choice values are standardized and all functions handle them correctly

-- First, standardize all side_choice data to use lowercase values
UPDATE public.map_veto_actions
SET side_choice = CASE 
    WHEN LOWER(side_choice) = 'attack' THEN 'attack'
    WHEN LOWER(side_choice) IN ('defense', 'defend') THEN 'defend'
    ELSE side_choice
END
WHERE side_choice IS NOT NULL;

-- Drop and recreate set_side_choice function with consistent parameter names
DROP FUNCTION IF EXISTS public.set_side_choice(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.set_side_choice(
    p_match_id uuid,
    p_user_id uuid,
    p_side_choice text
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    session_rec RECORD;
    match_rec RECORD;
    user_team_id uuid;
    picked_map_action_id uuid;
    now_time timestamp with time zone := now();
    normalized_side_choice text;
BEGIN
    -- Normalize side choice input
    normalized_side_choice := CASE 
        WHEN LOWER(TRIM(p_side_choice)) = 'attack' THEN 'attack'
        WHEN LOWER(TRIM(p_side_choice)) IN ('defense', 'defend') THEN 'defend'
        ELSE LOWER(TRIM(p_side_choice))
    END;

    -- Get the veto session for this match
    SELECT * INTO session_rec 
    FROM map_veto_sessions 
    WHERE match_id = p_match_id;
    
    IF session_rec IS NULL THEN
        RETURN 'No veto session found for this match';
    END IF;
    
    -- Get match details
    SELECT * INTO match_rec FROM matches WHERE id = p_match_id;
    IF match_rec IS NULL THEN
        RETURN 'Match not found';
    END IF;
    
    -- Check if user is on the home team (only home team sets side choice)
    SELECT team_id INTO user_team_id 
    FROM team_members 
    WHERE user_id = p_user_id 
      AND team_id = session_rec.home_team_id;
    
    IF user_team_id IS NULL THEN
        RETURN 'Only home team captain can set side choice';
    END IF;
    
    -- Validate side choice
    IF normalized_side_choice NOT IN ('attack', 'defend') THEN
        RETURN 'Invalid side choice. Must be attack or defend.';
    END IF;
    
    -- Find the pick action that needs side choice
    SELECT id INTO picked_map_action_id
    FROM map_veto_actions
    WHERE veto_session_id = session_rec.id 
      AND action = 'pick'
      AND side_choice IS NULL
    LIMIT 1;
    
    IF picked_map_action_id IS NULL THEN
        RETURN 'No pick action found that needs side choice, or side choice already set';
    END IF;
    
    -- Update side_choice on that veto action (store normalized value)
    UPDATE map_veto_actions 
    SET side_choice = normalized_side_choice, performed_by = p_user_id, performed_at = now_time
    WHERE id = picked_map_action_id;
    
    -- Complete the veto session now that side choice is set
    UPDATE map_veto_sessions 
    SET status = 'completed', completed_at = now_time
    WHERE id = session_rec.id;
    
    RETURN 'OK';
END;
$$;

-- Update the choose_veto_side function to handle all variations and normalize to 'attack'/'defend'
CREATE OR REPLACE FUNCTION public.choose_veto_side(p_match_id uuid, p_user_id uuid, p_side_choice text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  session_rec RECORD;
  match_rec RECORD;
  user_team_id uuid;
  picked_map_action_id uuid;
  normalized_side_choice text;
BEGIN
  -- Normalize side choice input
  normalized_side_choice := CASE 
    WHEN LOWER(TRIM(p_side_choice)) = 'attack' THEN 'attack'
    WHEN LOWER(TRIM(p_side_choice)) IN ('defense', 'defend') THEN 'defend'
    ELSE LOWER(TRIM(p_side_choice))
  END;

  -- Validate normalized side choice
  IF normalized_side_choice NOT IN ('attack', 'defend') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid side choice. Must be attack or defend.');
  END IF;

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
  
  -- Update the side choice with normalized value
  UPDATE map_veto_actions
  SET side_choice = normalized_side_choice
  WHERE id = picked_map_action_id;
  
  -- Mark session as completed
  UPDATE map_veto_sessions
  SET status = 'completed',
      completed_at = now()
  WHERE id = session_rec.id;
  
  RETURN jsonb_build_object('success', true, 'side_choice', normalized_side_choice);
END;
$$;

-- Log the comprehensive fix
INSERT INTO audit_logs (
  table_name, action, record_id, user_id, new_values, created_at
) VALUES (
  'map_veto_actions',
  'DATA_CONSISTENCY_FIX',
  gen_random_uuid(),
  NULL,
  jsonb_build_object(
    'description', 'Comprehensive side_choice data normalization and function fixes',
    'changes', 'Standardized all side_choice values and updated functions to handle variations'
  ),
  now()
);