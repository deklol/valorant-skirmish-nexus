
-- 1. Function: Set side choice after all bans/pick complete in BO1. Only home team can call (security).

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
    match_rec RECORD;
    home_team_id uuid;
    is_home_captain BOOLEAN;
    last_pick_id uuid;
    now_time timestamp with time zone := now();
BEGIN
    -- Fetch session and match
    SELECT * INTO session_rec FROM map_veto_sessions WHERE id = p_veto_session_id;
    IF session_rec IS NULL THEN
        RETURN 'Veto session not found';
    END IF;
    IF session_rec.status = 'completed' THEN
        RETURN 'Veto already completed';
    END IF;
    IF session_rec.match_id IS NULL THEN
        RETURN 'No match assigned to session';
    END IF;
    SELECT * INTO match_rec FROM matches WHERE id = session_rec.match_id;
    IF match_rec IS NULL THEN
        RETURN 'Match not found';
    END IF;
    home_team_id := session_rec.home_team_id;

    -- Permission: Only current_turn_team_id == home_team_id allowed, and user must be a captain (or member)
    SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE user_id = p_user_id AND team_id = home_team_id AND is_captain = TRUE
    ) INTO is_home_captain;
    IF NOT is_home_captain THEN
        RETURN 'You are not a captain of the home team';
    END IF;
    IF session_rec.current_turn_team_id IS DISTINCT FROM home_team_id THEN
        RETURN 'Not home team''s turn to pick side';
    END IF;

    -- Side can only be 'attack' or 'defend' (standardize)
    IF p_side_choice NOT IN ('attack', 'defend') THEN
        RETURN 'Side choice must be attack or defend';
    END IF;

    -- Find the last auto-pick map action (BO1)
    SELECT id INTO last_pick_id FROM map_veto_actions
    WHERE veto_session_id = p_veto_session_id AND action = 'pick'
    ORDER BY order_number DESC
    LIMIT 1;

    IF last_pick_id IS NULL THEN
        RETURN 'No map to set side for yet';
    END IF;

    -- Update side_choice on that veto action
    UPDATE map_veto_actions
    SET side_choice = p_side_choice, performed_by = p_user_id, performed_at = now_time
    WHERE id = last_pick_id;

    -- Mark veto as completed
    UPDATE map_veto_sessions
    SET status = 'completed', completed_at = now_time
    WHERE id = p_veto_session_id;

    RETURN 'OK';
END;
$$;

--------------------------------------------------------------------------------
-- 2. COMPETITIVE BO1 BAN SEQUENCE: Sync backend with frontend ban logic!

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
    bans_made INT;
    total_bans_needed INT;
    remaining_maps INT;
    veto_action_type TEXT;
    opposite_team uuid;
    inserted_action_id uuid;
    maps_count INT;
    last_map_id uuid;
    auto_pick_id uuid;
    step_idx INT;
    ban_order INTEGER[];
    ban_teams UUID[];
    is_bo1 BOOLEAN;
BEGIN
    -- Fetch session and match/teams as usual
    SELECT * INTO session_rec FROM map_veto_sessions WHERE id = p_veto_session_id;
    IF session_rec IS NULL THEN RETURN 'Veto session does not exist'; END IF;
    IF session_rec.status IS DISTINCT FROM 'in_progress' THEN RETURN 'Veto session not in progress'; END IF;
    IF session_rec.match_id IS NULL THEN RETURN 'Veto session does not have a valid match_id'; END IF;
    SELECT * INTO match_rec FROM matches WHERE id = session_rec.match_id;
    IF match_rec IS NULL THEN RETURN 'Match not found for session'; END IF;

    v_team1_id := match_rec.team1_id;
    v_team2_id := match_rec.team2_id;
    v_home_team_id := session_rec.home_team_id;
    v_away_team_id := session_rec.away_team_id;
    is_bo1 := match_rec.best_of = 1;

    -- Team validation
    IF v_team1_id IS NULL OR v_team2_id IS NULL THEN RETURN 'Both teams must be assigned for veto'; END IF;
    is_on_team := public.is_user_on_team(p_user_id, p_team_id);
    IF NOT is_on_team THEN RETURN 'User is not a member of this team'; END IF;
    IF session_rec.current_turn_team_id IS DISTINCT FROM p_team_id THEN RETURN 'It is not your team''s turn'; END IF;

    -- Map validation
    SELECT * INTO map_rec FROM maps WHERE id = p_map_id AND is_active = TRUE;
    IF map_rec IS NULL THEN RETURN 'Invalid or inactive map'; END IF;
    IF EXISTS (
        SELECT 1 FROM map_veto_actions
        WHERE veto_session_id = p_veto_session_id AND map_id = p_map_id
    ) THEN RETURN 'This map has already been picked or banned'; END IF;

    -- Calculate bans/order for BO1 logic
    SELECT COUNT(*) INTO maps_count FROM maps WHERE is_active = TRUE;
    bans_made := (SELECT COUNT(*) FROM map_veto_actions WHERE veto_session_id = p_veto_session_id AND action = 'ban');
    total_bans_needed := maps_count - 1;
    remaining_maps := total_bans_needed + 1 - bans_made;

    IF is_bo1 THEN
        -- Build ban_teams array for proper competitive flow
        -- Example: 7 maps: Home, Away, Away, Home, Away, Home (until one map left)
        ban_teams := ARRAY[]::uuid[];
        ban_teams := array_append(ban_teams, v_home_team_id);    -- ban 1
        IF maps_count > 3 THEN
            ban_teams := array_append(ban_teams, v_away_team_id);   -- ban 2
            ban_teams := array_append(ban_teams, v_away_team_id);   -- ban 3 (if >3 maps)
        ELSE
            ban_teams := array_append(ban_teams, v_away_team_id);   -- Only 3 maps: just one away ban
        END IF;
        -- Keep alternating until only 1 map remains
        step_idx := array_length(ban_teams, 1) + 1;
        WHILE step_idx <= total_bans_needed LOOP
            -- Alternate Home/Away starting from Home after Away's double ban
            IF step_idx % 2 = 0 THEN
                ban_teams := array_append(ban_teams, v_away_team_id);
            ELSE
                ban_teams := array_append(ban_teams, v_home_team_id);
            END IF;
            step_idx := step_idx + 1;
        END LOOP;
        -- Find whose turn this ban is (enforce turn order)
        IF bans_made+1 > array_length(ban_teams, 1) THEN
            RETURN 'No more bans allowed';
        END IF;
        IF ban_teams[bans_made+1] IS DISTINCT FROM p_team_id THEN
            RETURN 'It is not your turn (BO1 competitive flow)';
        END IF;
        veto_action_type := 'ban';

        -- Insert the ban as normal
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

        -- If final ban: insert auto-pick (team NULL), set turn to home for side_pick
        IF bans_made + 1 = total_bans_needed THEN
            SELECT id INTO last_map_id FROM maps WHERE is_active = TRUE
            AND id NOT IN (SELECT map_id FROM map_veto_actions WHERE veto_session_id = p_veto_session_id);

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

            UPDATE map_veto_sessions
            SET current_turn_team_id = v_home_team_id
            WHERE id = p_veto_session_id;

            RETURN 'OK';
        ELSE
            -- Move to next turn (from ban_teams list)
            IF bans_made+2 > array_length(ban_teams, 1) THEN
                -- Do not advance turn beyond final ban
                RETURN 'OK';
            END IF;
            UPDATE map_veto_sessions
            SET current_turn_team_id = ban_teams[bans_made+2]
            WHERE id = p_veto_session_id;
        END IF;

        RETURN 'OK';
    END IF; -- END OF BO1

    -- Non-BO1: legacy logic
    IF total_bans_needed = bans_made AND remaining_maps = 1 THEN
        veto_action_type := 'pick';
    ELSE
        veto_action_type := 'ban';
    END IF;
    -- 5. Insert action, use enum for 'action'
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

    -- Final pick, mark as completed, etc.
    IF total_bans_needed = bans_made AND remaining_maps = 1 THEN
        SELECT id INTO last_map_id FROM maps WHERE is_active = TRUE
            AND id NOT IN (SELECT map_id FROM map_veto_actions WHERE veto_session_id = p_veto_session_id);

        IF p_team_id = v_team1_id THEN
            opposite_team := v_team2_id;
        ELSE
            opposite_team := v_team1_id;
        END IF;

        INSERT INTO map_veto_actions (
            veto_session_id,
            team_id,
            map_id,
            action,
            order_number,
            performed_by
        )
        SELECT
            p_veto_session_id,
            opposite_team,
            id,
            'pick'::map_veto_action,
            (SELECT COALESCE(MAX(order_number), 0) + 1 FROM map_veto_actions WHERE veto_session_id = p_veto_session_id),
            NULL
        FROM maps WHERE is_active = TRUE
            AND id NOT IN (SELECT map_id FROM map_veto_actions WHERE veto_session_id = p_veto_session_id)
        LIMIT 1;

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
