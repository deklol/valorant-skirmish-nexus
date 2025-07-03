-- Fix perform_veto_action function to properly handle BO1 competitive ban sequence
-- and fix the current stuck veto session

-- 1. First, fix the current stuck session
UPDATE map_veto_sessions 
SET current_turn_team_id = '50855923-3e25-4d63-b63c-2f06c2bcf076' -- home team should be next after away team's ban 3
WHERE id = '762d5585-a07c-4107-9dd4-872209b3f890'
AND current_turn_team_id = '72405635-b689-43f6-9ea5-93b5bbe8d5a2'; -- only update if it's still stuck on away team

-- 2. Fix the perform_veto_action function with proper BO1 ban sequence logic
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
    tournament_rec RECORD;
    v_team1_id uuid;
    v_team2_id uuid;
    v_home_team_id uuid;
    v_away_team_id uuid;
    is_on_team BOOLEAN;
    bans_made INT;
    total_maps_in_pool INT;
    total_bans_needed INT;
    remaining_maps INT;
    veto_action_type TEXT;
    opposite_team uuid;
    inserted_action_id uuid;
    last_map_id uuid;
    auto_pick_id uuid;
    ban_sequence UUID[];
    is_bo1 BOOLEAN;
    next_team_id uuid;
    current_ban_position INT;
BEGIN
    -- Fetch session, match, and tournament
    SELECT * INTO session_rec FROM map_veto_sessions WHERE id = p_veto_session_id;
    IF session_rec IS NULL THEN RETURN 'Veto session does not exist'; END IF;
    IF session_rec.status IS DISTINCT FROM 'in_progress' THEN RETURN 'Veto session not in progress'; END IF;
    IF session_rec.match_id IS NULL THEN RETURN 'Veto session does not have a valid match_id'; END IF;
    
    SELECT * INTO match_rec FROM matches WHERE id = session_rec.match_id;
    IF match_rec IS NULL THEN RETURN 'Match not found for session'; END IF;
    
    SELECT * INTO tournament_rec FROM tournaments WHERE id = match_rec.tournament_id;
    IF tournament_rec IS NULL THEN RETURN 'Tournament not found for match'; END IF;

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

    -- Validate map exists and is in tournament map pool
    IF tournament_rec.map_pool IS NULL OR jsonb_array_length(tournament_rec.map_pool) = 0 THEN
        RETURN 'Tournament has no map pool defined';
    END IF;
    
    SELECT * INTO map_rec FROM maps WHERE id = p_map_id;
    IF map_rec IS NULL THEN RETURN 'Map does not exist'; END IF;
    
    IF NOT (p_map_id::text = ANY(SELECT jsonb_array_elements_text(tournament_rec.map_pool))) THEN
        RETURN 'Map is not in this tournament''s map pool';
    END IF;

    IF EXISTS (
        SELECT 1 FROM map_veto_actions
        WHERE veto_session_id = p_veto_session_id AND map_id = p_map_id
    ) THEN RETURN 'This map has already been picked or banned'; END IF;

    -- Calculate bans/order for BO1 logic using tournament map pool
    total_maps_in_pool := jsonb_array_length(tournament_rec.map_pool);
    bans_made := (SELECT COUNT(*) FROM map_veto_actions WHERE veto_session_id = p_veto_session_id AND action = 'ban');
    total_bans_needed := total_maps_in_pool - 1;
    remaining_maps := total_bans_needed + 1 - bans_made;
    current_ban_position := bans_made + 1; -- Position of current ban (1-indexed)

    IF is_bo1 THEN
        -- Build exact competitive ban sequence for BO1
        -- Standard competitive sequence: [home, away, away, home, away, home, ...] 
        ban_sequence := ARRAY[]::UUID[];
        
        -- Position 1: Home team
        ban_sequence := ban_sequence || ARRAY[v_home_team_id];
        
        -- Positions 2-3: Away team (double ban)
        IF total_maps_in_pool >= 4 THEN
            ban_sequence := ban_sequence || ARRAY[v_away_team_id, v_away_team_id];
        ELSE
            ban_sequence := ban_sequence || ARRAY[v_away_team_id];
        END IF;
        
        -- Remaining positions: Alternate starting with home
        FOR i IN (array_length(ban_sequence, 1) + 1)..total_bans_needed LOOP
            -- After initial [home, away, away], continue alternating: home, away, home, away...
            IF (i - 3) % 2 = 1 THEN  -- Odd positions after initial 3: home
                ban_sequence := ban_sequence || ARRAY[v_home_team_id];
            ELSE  -- Even positions after initial 3: away
                ban_sequence := ban_sequence || ARRAY[v_away_team_id];
            END IF;
        END LOOP;
        
        -- Validate current ban position and team
        IF current_ban_position > array_length(ban_sequence, 1) THEN
            RETURN 'No more bans allowed - sequence complete';
        END IF;
        
        IF ban_sequence[current_ban_position] IS DISTINCT FROM p_team_id THEN
            RAISE LOG 'BO1 Veto Validation Failed: Position %, Expected team %, Got team %, Sequence: %', 
                current_ban_position, ban_sequence[current_ban_position], p_team_id, ban_sequence;
            RETURN 'It is not your turn in the competitive ban sequence';
        END IF;
        
        veto_action_type := 'ban';

        -- Insert the ban
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
            current_ban_position,
            p_user_id
        )
        RETURNING id INTO inserted_action_id;

        -- Determine next action
        IF current_ban_position = total_bans_needed THEN
            -- Final ban completed - auto-pick remaining map and set turn to home for side choice
            SELECT m.id INTO last_map_id 
            FROM maps m
            WHERE m.id::text = ANY(SELECT jsonb_array_elements_text(tournament_rec.map_pool))
            AND m.id NOT IN (SELECT map_id FROM map_veto_actions WHERE veto_session_id = p_veto_session_id)
            LIMIT 1;

            IF last_map_id IS NULL THEN
                RETURN 'No remaining map found in tournament pool';
            END IF;

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
                NULL,  -- Auto-pick has no team
                last_map_id,
                'pick'::map_veto_action,
                current_ban_position + 1,
                NULL
            ) RETURNING id INTO auto_pick_id;

            -- Set turn to home team for side choice
            UPDATE map_veto_sessions
            SET current_turn_team_id = v_home_team_id
            WHERE id = p_veto_session_id;

            RAISE LOG 'BO1 Veto: Final ban completed, auto-picked map %, home team (%) can now choose side', 
                last_map_id, v_home_team_id;
        ELSE
            -- Move to next team in sequence
            next_team_id := ban_sequence[current_ban_position + 1];
            UPDATE map_veto_sessions
            SET current_turn_team_id = next_team_id
            WHERE id = p_veto_session_id;
            
            RAISE LOG 'BO1 Veto: Ban % completed by team %, next turn (ban %) goes to team %', 
                current_ban_position, p_team_id, current_ban_position + 1, next_team_id;
        END IF;

        RETURN 'OK';
    END IF; -- END OF BO1

    -- Non-BO1 logic (keeping existing logic for other formats)
    IF total_bans_needed = bans_made AND remaining_maps = 1 THEN
        veto_action_type := 'pick';
    ELSE
        veto_action_type := 'ban';
    END IF;

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

    -- Handle completion for non-BO1
    IF total_bans_needed = bans_made AND remaining_maps = 1 THEN
        SELECT m.id INTO last_map_id 
        FROM maps m
        WHERE m.id::text = ANY(SELECT jsonb_array_elements_text(tournament_rec.map_pool))
        AND m.id NOT IN (SELECT map_veto_actions.map_id FROM map_veto_actions WHERE veto_session_id = p_veto_session_id);

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
        VALUES (
            p_veto_session_id,
            opposite_team,
            last_map_id,
            'pick'::map_veto_action,
            (SELECT COALESCE(MAX(order_number), 0) + 1 FROM map_veto_actions WHERE veto_session_id = p_veto_session_id),
            NULL
        );

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