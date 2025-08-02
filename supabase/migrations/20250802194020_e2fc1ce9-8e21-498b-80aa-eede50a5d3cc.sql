-- Fix veto system issues - Fix user role enum reference

-- 1. Drop existing policies that depend on functions
DROP POLICY IF EXISTS "Team captains can create veto actions" ON map_veto_actions;
DROP POLICY IF EXISTS "Home team captain can set side_choice" ON map_veto_actions;

-- 2. Drop existing conflicting functions
DROP FUNCTION IF EXISTS public.is_team_captain(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- 3. Add helper function to check if user is on team
CREATE OR REPLACE FUNCTION public.is_user_on_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = p_user_id AND team_id = p_team_id
  );
$$;

-- 4. Add function to check if user is team captain
CREATE OR REPLACE FUNCTION public.is_team_captain(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = p_user_id AND team_id = p_team_id AND is_captain = true
  );
$$;

-- 5. Add function to get user role safely - fix enum reference
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(role, 'player'::user_role) FROM users WHERE id = p_user_id;
$$;

-- 6. Create new RLS policies for map_veto_actions
CREATE POLICY "Team members can create veto actions" 
ON map_veto_actions 
FOR INSERT 
WITH CHECK (
  -- Allow system auto-picks (NULL team_id and performed_by)
  (team_id IS NULL AND performed_by IS NULL) 
  OR 
  -- Allow admins
  (get_user_role(auth.uid()) = 'admin'::user_role) 
  OR 
  -- Allow team members (not just captains)
  (team_id IS NOT NULL AND is_user_on_team(auth.uid(), team_id))
);

CREATE POLICY "Home team captain can set side_choice" 
ON map_veto_actions 
FOR UPDATE 
USING (
  (action = 'pick'::map_veto_action) 
  AND (
    EXISTS (
      SELECT 1
      FROM ((map_veto_sessions session
        JOIN matches m ON ((session.match_id = m.id)))
        JOIN team_members tm ON ((tm.team_id = session.home_team_id)))
      WHERE ((session.id = map_veto_actions.veto_session_id) 
        AND (tm.user_id = auth.uid()) 
        AND (tm.is_captain = true))
    )
  )
);

-- 7. Fix veto-related RPC functions to be SECURITY DEFINER

-- Roll dice function
CREATE OR REPLACE FUNCTION public.roll_veto_dice(p_match_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    match_rec RECORD;
    existing_session RECORD;
    dice_result INTEGER;
    home_team_id UUID;
    away_team_id UUID;
    session_id UUID;
    is_team_member BOOLEAN := false;
BEGIN
    -- Get match details
    SELECT * INTO match_rec FROM matches WHERE id = p_match_id;
    IF match_rec IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    -- Check if map veto is enabled for this match
    IF NOT COALESCE(match_rec.map_veto_enabled, false) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Map veto is not enabled for this match');
    END IF;

    -- Check if user is on one of the teams
    SELECT EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.user_id = p_user_id 
        AND (tm.team_id = match_rec.team1_id OR tm.team_id = match_rec.team2_id)
    ) INTO is_team_member;

    IF NOT is_team_member AND get_user_role(p_user_id) != 'admin'::user_role THEN
        RETURN jsonb_build_object('success', false, 'error', 'You must be on one of the participating teams to roll dice');
    END IF;

    -- Check if veto session already exists
    SELECT * INTO existing_session FROM map_veto_sessions WHERE match_id = p_match_id;
    IF existing_session IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Veto session already exists for this match');
    END IF;

    -- Roll dice (1-100)
    dice_result := (random() * 100)::integer + 1;
    
    -- Determine home/away teams based on dice result
    IF dice_result <= 50 THEN
        home_team_id := match_rec.team1_id;
        away_team_id := match_rec.team2_id;
    ELSE
        home_team_id := match_rec.team2_id;
        away_team_id := match_rec.team1_id;
    END IF;

    -- Create veto session
    INSERT INTO map_veto_sessions (
        match_id,
        home_team_id,
        away_team_id,
        current_turn_team_id,
        status,
        roll_seed,
        roll_timestamp,
        roll_initiator_id,
        started_at
    ) VALUES (
        p_match_id,
        home_team_id,
        away_team_id,
        home_team_id, -- Home team starts
        'in_progress'::map_veto_status,
        dice_result::text,
        now(),
        p_user_id,
        now()
    ) RETURNING id INTO session_id;

    RETURN jsonb_build_object(
        'success', true,
        'dice_result', dice_result,
        'home_team_id', home_team_id,
        'away_team_id', away_team_id,
        'session_id', session_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to roll dice: ' || SQLERRM
    );
END;
$$;

-- Perform veto ban function  
CREATE OR REPLACE FUNCTION public.perform_veto_ban(p_match_id uuid, p_user_id uuid, p_map_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_rec RECORD;
    result TEXT;
    user_team_id UUID;
BEGIN
    -- Get veto session
    SELECT * INTO session_rec FROM map_veto_sessions WHERE match_id = p_match_id;
    IF session_rec IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No veto session found for this match');
    END IF;

    -- Determine which team the user is on
    SELECT team_id INTO user_team_id 
    FROM team_members 
    WHERE user_id = p_user_id 
    AND (team_id = session_rec.home_team_id OR team_id = session_rec.away_team_id)
    LIMIT 1;
    
    IF user_team_id IS NULL AND get_user_role(p_user_id) != 'admin'::user_role THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not on either team');
    END IF;

    -- Use home team if admin
    IF user_team_id IS NULL THEN
        user_team_id := session_rec.home_team_id;
    END IF;

    -- Call the veto action function
    SELECT perform_veto_action(session_rec.id, p_user_id, user_team_id, p_map_id) INTO result;
    
    IF result = 'OK' THEN
        RETURN jsonb_build_object('success', true);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', result);
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to perform veto action: ' || SQLERRM
    );
END;
$$;

-- Set side choice function
CREATE OR REPLACE FUNCTION public.set_side_choice(p_match_id uuid, p_user_id uuid, p_side_choice text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_rec RECORD;
    pick_action RECORD;
    is_home_team_member BOOLEAN;
BEGIN
    -- Get veto session
    SELECT * INTO session_rec FROM map_veto_sessions WHERE match_id = p_match_id;
    IF session_rec IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No veto session found');
    END IF;

    -- Check if user is on home team
    SELECT EXISTS (
        SELECT 1 FROM team_members 
        WHERE user_id = p_user_id AND team_id = session_rec.home_team_id
    ) INTO is_home_team_member;

    IF NOT is_home_team_member AND get_user_role(p_user_id) != 'admin'::user_role THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only home team members can choose side');
    END IF;

    -- Find the picked map
    SELECT * INTO pick_action 
    FROM map_veto_actions 
    WHERE veto_session_id = session_rec.id AND action = 'pick'::map_veto_action
    ORDER BY order_number DESC
    LIMIT 1;

    IF pick_action IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No map has been picked yet');
    END IF;

    -- Update the side choice
    UPDATE map_veto_actions 
    SET side_choice = p_side_choice
    WHERE id = pick_action.id;

    -- Mark session as completed
    UPDATE map_veto_sessions 
    SET status = 'completed'::map_veto_status, completed_at = now()
    WHERE id = session_rec.id;

    RETURN jsonb_build_object('success', true, 'side_choice', p_side_choice);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to set side choice: ' || SQLERRM
    );
END;
$$;

-- 8. Fix match creation to inherit tournament veto settings
-- Update existing matches that have NULL map_veto_enabled
UPDATE matches 
SET map_veto_enabled = t.enable_map_veto
FROM tournaments t 
WHERE matches.tournament_id = t.id 
AND matches.map_veto_enabled IS NULL;