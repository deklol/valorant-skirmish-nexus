
-- Fix map veto schema issues and add missing columns

-- Add missing columns to map_veto_sessions
ALTER TABLE public.map_veto_sessions 
ADD COLUMN IF NOT EXISTS home_team_id uuid REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS away_team_id uuid REFERENCES public.teams(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_map_veto_sessions_home_team ON public.map_veto_sessions(home_team_id);
CREATE INDEX IF NOT EXISTS idx_map_veto_sessions_away_team ON public.map_veto_sessions(away_team_id);

-- Update the perform_veto_action function to handle BO1 side selection properly
CREATE OR REPLACE FUNCTION public.perform_veto_action(
    p_veto_session_id uuid,
    p_user_id uuid,
    p_team_id uuid,
    p_map_id uuid
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    session_rec RECORD;
    map_rec RECORD;
    match_rec RECORD;
    v_team1_id uuid;
    v_team2_id uuid;
    v_home_team_id uuid;
    v_away_team_id uuid;
    is_on_team BOOLEAN;
    is_captain BOOLEAN;
    bans_made INT;
    total_bans_needed INT;
    remaining_maps INT;
    veto_action_type TEXT;
    opposite_team uuid;
    inserted_action_id uuid;
    maps_count INT;
    last_map_id uuid;
    auto_pick_id uuid;
    num_veto_actions INT;
    is_bo1 BOOLEAN;
BEGIN
    -- 1. Validate veto session, get session record
    SELECT * INTO session_rec FROM map_veto_sessions WHERE id = p_veto_session_id;
    IF session_rec IS NULL THEN
        RETURN 'Veto session does not exist';
    END IF;

    IF session_rec.status IS DISTINCT FROM 'in_progress' THEN
        RETURN 'Veto session not in progress';
    END IF;

    -- Lookup the related match to get team IDs
    IF session_rec.match_id IS NULL THEN
        RETURN 'Veto session does not have a valid match_id';
    END IF;
    SELECT * INTO match_rec FROM matches WHERE id = session_rec.match_id;
    IF match_rec IS NULL THEN
        RETURN 'Match not found for session';
    END IF;

    v_team1_id := match_rec.team1_id;
    v_team2_id := match_rec.team2_id;
    v_home_team_id := session_rec.home_team_id;
    v_away_team_id := session_rec.away_team_id;

    IF v_team1_id IS NULL OR v_team2_id IS NULL THEN
        RETURN 'Both teams must be assigned for veto';
    END IF;

    -- 2. Validate user is on team and is captain
    is_on_team := public.is_user_on_team(p_user_id, p_team_id);
    IF NOT is_on_team THEN
        RETURN 'User is not a member of this team';
    END IF;

    -- Check if user is captain
    SELECT EXISTS (
        SELECT 1 FROM team_members 
        WHERE user_id = p_user_id 
        AND team_id = p_team_id 
        AND is_captain = TRUE
    ) INTO is_captain;

    IF NOT is_captain THEN
        RETURN 'Only team captains can perform veto actions';
    END IF;

    IF session_rec.current_turn_team_id IS DISTINCT FROM p_team_id THEN
        RETURN 'It is not your team''s turn';
    END IF;

    -- 3. Validate map exists and is available
    SELECT * INTO map_rec FROM maps WHERE id = p_map_id AND is_active = TRUE;
    IF map_rec IS NULL THEN
        RETURN 'Invalid or inactive map';
    END IF;

    IF EXISTS (
        SELECT 1 FROM map_veto_actions
        WHERE veto_session_id = p_veto_session_id AND map_id = p_map_id
    ) THEN
        RETURN 'This map has already been picked or banned';
    END IF;

    -- Count number of maps and veto actions for BO1 logic
    SELECT COUNT(*) INTO maps_count FROM maps WHERE is_active = TRUE;
    SELECT COUNT(*) INTO num_veto_actions FROM map_veto_actions WHERE veto_session_id = p_veto_session_id;

    -- Standard calculation
    bans_made := (SELECT COUNT(*) FROM map_veto_actions WHERE veto_session_id = p_veto_session_id AND action = 'ban');
    total_bans_needed := maps_count - 1;
    remaining_maps := total_bans_needed + 1 - bans_made;

    -- Determine if BO1
    is_bo1 := match_rec.best_of = 1;

    -- 4. Determine action type and veto status
    IF is_bo1 THEN
        -- BO1 logic: Alternate bans, final map is auto-picked, home team picks side
        IF bans_made < total_bans_needed THEN
            -- Normal ban
            veto_action_type := 'ban';
        ELSE
            -- All bans complete; do not allow further bans/picks
            RETURN 'All bans complete. Waiting for side selection.';
        END IF;

        -- Insert the ban action as normal
        INSERT INTO map_veto_actions (
            veto_session_id,
            team_id,
            map_id,
            action,
            order_number,
            performed_by
        )
        VALUES (
            p_veto_session_id,
            p_team_id,
            p_map_id,
            veto_action_type::map_veto_action,
            (SELECT COALESCE(MAX(order_number), 0) + 1 FROM map_veto_actions WHERE veto_session_id = p_veto_session_id),
            p_user_id
        )
        RETURNING id INTO inserted_action_id;

        -- If this is the final ban, auto-pick the last map
        IF bans_made + 1 = total_bans_needed THEN
            -- Find remaining map that hasn't been picked or banned
            SELECT id INTO last_map_id FROM maps WHERE is_active = TRUE
            AND id NOT IN (SELECT map_id FROM map_veto_actions WHERE veto_session_id = p_veto_session_id);

            -- Insert auto-pick (no team assigned for auto-pick)
            INSERT INTO map_veto_actions (
                veto_session_id,
                team_id,
                map_id,
                action,
                order_number,
                performed_by
            )
            VALUES (
                p_veto_session_id,
                NULL,
                last_map_id,
                'pick'::map_veto_action,
                (SELECT COALESCE(MAX(order_number), 0) + 1 FROM map_veto_actions WHERE veto_session_id = p_veto_session_id),
                NULL
            ) RETURNING id INTO auto_pick_id;

            -- Set the turn to home_team for side selection
            UPDATE map_veto_sessions
            SET current_turn_team_id = v_home_team_id
            WHERE id = p_veto_session_id;
        ELSE
            -- Switch turn to opposite team for next ban
            IF p_team_id = v_team1_id THEN
                opposite_team := v_team2_id;
            ELSE
                opposite_team := v_team1_id;
            END IF;

            UPDATE map_veto_sessions
            SET current_turn_team_id = opposite_team
            WHERE id = p_veto_session_id;
        END IF;

        RETURN 'OK';
    END IF;

    -- Not BO1, legacy BO3/BO5 flow (simplified)
    IF total_bans_needed = bans_made AND remaining_maps = 1 THEN
        veto_action_type := 'pick';
    ELSE
        veto_action_type := 'ban';
    END IF;

    -- Insert action
    INSERT INTO map_veto_actions (
        veto_session_id,
        team_id,
        map_id,
        action,
        order_number,
        performed_by
    )
    VALUES (
        p_veto_session_id,
        p_team_id,
        p_map_id,
        veto_action_type::map_veto_action,
        (SELECT COALESCE(MAX(order_number), 0) + 1 FROM map_veto_actions WHERE veto_session_id = p_veto_session_id),
        p_user_id
    )
    RETURNING id INTO inserted_action_id;

    -- Complete veto logic for BO3/BO5
    IF total_bans_needed = bans_made AND remaining_maps = 1 THEN
        UPDATE map_veto_sessions
        SET status = 'completed',
            completed_at = now()
        WHERE id = p_veto_session_id;
    ELSE
        IF p_team_id = v_team1_id THEN
            opposite_team := v_team2_id;
        ELSE
            opposite_team := v_team1_id;
        END IF;
        UPDATE map_veto_sessions
        SET current_turn_team_id = opposite_team
        WHERE id = p_veto_session_id;
    END IF;

    RETURN 'OK';
END;
$$;

-- Function to handle side selection for BO1
CREATE OR REPLACE FUNCTION public.set_side_choice(
    p_veto_session_id uuid,
    p_user_id uuid,
    p_side_choice text
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    session_rec RECORD;
    pick_action_rec RECORD;
    is_home_captain BOOLEAN;
BEGIN
    -- Validate session
    SELECT * INTO session_rec FROM map_veto_sessions WHERE id = p_veto_session_id;
    IF session_rec IS NULL THEN
        RETURN 'Veto session does not exist';
    END IF;

    -- Check if user is home team captain
    SELECT EXISTS (
        SELECT 1 FROM team_members 
        WHERE user_id = p_user_id 
        AND team_id = session_rec.home_team_id 
        AND is_captain = TRUE
    ) INTO is_home_captain;

    IF NOT is_home_captain THEN
        RETURN 'Only home team captain can select side';
    END IF;

    -- Find the pick action that needs side choice
    SELECT * INTO pick_action_rec 
    FROM map_veto_actions 
    WHERE veto_session_id = p_veto_session_id 
    AND action = 'pick' 
    AND side_choice IS NULL
    ORDER BY order_number DESC
    LIMIT 1;

    IF pick_action_rec IS NULL THEN
        RETURN 'No pick action found that needs side selection';
    END IF;

    -- Validate side choice
    IF p_side_choice NOT IN ('attack', 'defend') THEN
        RETURN 'Invalid side choice. Must be attack or defend';
    END IF;

    -- Update the pick action with side choice
    UPDATE map_veto_actions
    SET side_choice = p_side_choice
    WHERE id = pick_action_rec.id;

    -- Mark session as completed
    UPDATE map_veto_sessions
    SET status = 'completed',
        completed_at = now()
    WHERE id = p_veto_session_id;

    RETURN 'OK';
END;
$$;

-- Improved RLS policies
DROP POLICY IF EXISTS "Team captains can insert veto if on match team, captain, and turn" ON public.map_veto_actions;
DROP POLICY IF EXISTS "Home team captain can set side_choice" ON public.map_veto_actions;

-- Simplified captain policy for veto actions
CREATE POLICY "Team captains can insert veto actions" ON public.map_veto_actions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM map_veto_sessions session
    JOIN matches m ON session.match_id = m.id
    JOIN team_members tm ON (tm.team_id = m.team1_id OR tm.team_id = m.team2_id)
    WHERE
      session.id = map_veto_actions.veto_session_id
      AND tm.user_id = auth.uid()
      AND tm.is_captain = TRUE
      AND tm.team_id = map_veto_actions.team_id
  )
);

-- Policy for side choice updates
CREATE POLICY "Home team captain can update side choice" ON public.map_veto_actions
FOR UPDATE
TO authenticated
USING (
  action = 'pick' AND EXISTS (
    SELECT 1 FROM map_veto_sessions session
    JOIN team_members tm ON tm.team_id = session.home_team_id
    WHERE
      session.id = map_veto_actions.veto_session_id
      AND tm.user_id = auth.uid()
      AND tm.is_captain = TRUE
  )
);
