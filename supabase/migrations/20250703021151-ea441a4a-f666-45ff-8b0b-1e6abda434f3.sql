-- Fix the perform_veto_action function to correctly handle turn switching in BO1 veto
CREATE OR REPLACE FUNCTION public.perform_veto_action(p_veto_session_id uuid, p_user_id uuid, p_team_id uuid, p_map_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
    
    -- Check if map is in tournament map pool
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

    IF is_bo1 THEN
        -- Build hardcoded ban sequence for competitive BO1 (7 maps = 6 bans)
        -- Format: [home, away, away, home, away, home]
        ban_sequence := ARRAY[v_home_team_id];  -- ban 1: home
        
        IF total_maps_in_pool >= 4 THEN
            ban_sequence := ban_sequence || ARRAY[v_away_team_id, v_away_team_id];  -- ban 2,3: away, away
        ELSE
            ban_sequence := ban_sequence || ARRAY[v_away_team_id];  -- ban 2: away (for 3 maps)
        END IF;
        
        -- Continue alternating: home, away, home, away...
        FOR i IN (array_length(ban_sequence, 1) + 1)..total_bans_needed LOOP
            IF i % 2 = 0 THEN  -- Even positions after initial sequence: home
                ban_sequence := ban_sequence || ARRAY[v_home_team_id];
            ELSE  -- Odd positions after initial sequence: away
                ban_sequence := ban_sequence || ARRAY[v_away_team_id];
            END IF;
        END LOOP;
        
        -- Validate current ban is correct team's turn
        IF bans_made + 1 > array_length(ban_sequence, 1) THEN
            RETURN 'No more bans allowed';
        END IF;
        IF ban_sequence[bans_made + 1] IS DISTINCT FROM p_team_id THEN
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
            (SELECT COALESCE(MAX(order_number), 0) + 1 FROM map_veto_actions WHERE veto_session_id = p_veto_session_id),
            p_user_id
        )
        RETURNING id INTO inserted_action_id;

        -- If final ban: auto-pick remaining map, set turn to home for side choice
        IF bans_made + 1 = total_bans_needed THEN
            -- Find remaining map from tournament pool
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
                (SELECT COALESCE(MAX(order_number), 0) + 1 FROM map_veto_actions WHERE veto_session_id = p_veto_session_id),
                NULL
            ) RETURNING id INTO auto_pick_id;

            -- Set turn to home team for side choice
            UPDATE map_veto_sessions
            SET current_turn_team_id = v_home_team_id
            WHERE id = p_veto_session_id;

            RETURN 'OK';
        ELSE
            -- Move to next team in ban sequence - this is the critical fix
            IF bans_made + 2 <= array_length(ban_sequence, 1) THEN
                next_team_id := ban_sequence[bans_made + 2];
                UPDATE map_veto_sessions
                SET current_turn_team_id = next_team_id
                WHERE id = p_veto_session_id;
                
                -- Add logging to debug
                RAISE LOG 'BO1 Veto: Ban % completed by team %, next turn goes to team %', 
                    bans_made + 1, p_team_id, next_team_id;
            END IF;
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
$function$;