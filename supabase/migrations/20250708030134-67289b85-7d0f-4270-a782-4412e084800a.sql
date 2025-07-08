-- Enhanced Map Veto System: Add BO3 competitive veto support
-- BO3 Standard: Team A ban, Team B ban, Team A pick, Team B pick, Team B ban, Team A ban, Team A pick (decider)

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
    picks_made INT;
    total_maps_in_pool INT;
    veto_action_type TEXT;
    opposite_team uuid;
    inserted_action_id uuid;
    last_map_id uuid;
    auto_pick_id uuid;
    veto_sequence JSONB;
    is_bo1 BOOLEAN;
    is_bo3 BOOLEAN;
    next_team_id uuid;
    current_action_position INT;
    expected_action TEXT;
    expected_team_id uuid;
    debug_info TEXT;
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
    is_bo3 := match_rec.best_of = 3;

    -- Enhanced logging for debugging
    debug_info := format('Session: %s, Home: %s, Away: %s, Current Turn: %s, Requesting Team: %s, BO%s', 
                        p_veto_session_id::text, v_home_team_id::text, v_away_team_id::text, 
                        session_rec.current_turn_team_id::text, p_team_id::text, match_rec.best_of::text);
    RAISE LOG 'VETO DEBUG: %', debug_info;

    -- Team validation
    IF v_team1_id IS NULL OR v_team2_id IS NULL THEN RETURN 'Both teams must be assigned for veto'; END IF;
    is_on_team := public.is_user_on_team(p_user_id, p_team_id);
    IF NOT is_on_team THEN RETURN 'User is not a member of this team'; END IF;
    IF session_rec.current_turn_team_id IS DISTINCT FROM p_team_id THEN 
        RAISE LOG 'VETO TURN ERROR: Expected team %, got team %', session_rec.current_turn_team_id, p_team_id;
        RETURN 'It is not your team''s turn'; 
    END IF;

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

    -- Calculate current veto state
    total_maps_in_pool := jsonb_array_length(tournament_rec.map_pool);
    bans_made := (SELECT COUNT(*) FROM map_veto_actions WHERE veto_session_id = p_veto_session_id AND action = 'ban');
    picks_made := (SELECT COUNT(*) FROM map_veto_actions WHERE veto_session_id = p_veto_session_id AND action = 'pick');
    current_action_position := bans_made + picks_made + 1; -- Position of current action (1-indexed)

    RAISE LOG 'VETO PROGRESS: Position %, Bans made %, Picks made %, Maps in pool %', current_action_position, bans_made, picks_made, total_maps_in_pool;

    IF is_bo1 THEN
        -- BO1 LOGIC: Ban-ban-ban-ban-ban-ban-pick (for 7 maps)
        -- Standard competitive sequence: [home, away, away, home, away, home, auto-pick] 
        veto_sequence := jsonb_build_array(
            jsonb_build_object('team', v_home_team_id, 'action', 'ban'),    -- 1
            jsonb_build_object('team', v_away_team_id, 'action', 'ban'),    -- 2
            jsonb_build_object('team', v_away_team_id, 'action', 'ban'),    -- 3
            jsonb_build_object('team', v_home_team_id, 'action', 'ban'),    -- 4
            jsonb_build_object('team', v_away_team_id, 'action', 'ban'),    -- 5
            jsonb_build_object('team', v_home_team_id, 'action', 'ban'),    -- 6
            jsonb_build_object('team', null, 'action', 'pick')              -- 7 (auto-pick)
        );
        
        RAISE LOG 'BO1 VETO SEQUENCE: Generated sequence for position %', current_action_position;
        
        -- Validate current action position and team
        IF current_action_position > jsonb_array_length(veto_sequence) THEN
            RETURN 'No more actions allowed - veto sequence complete';
        END IF;
        
        expected_action := (veto_sequence->((current_action_position - 1)))->>'action';
        expected_team_id := (veto_sequence->((current_action_position - 1)))->>'team';
        
        -- Auto-pick case (final map)
        IF expected_team_id IS NULL THEN
            SELECT m.id INTO last_map_id 
            FROM maps m
            WHERE m.id::text = ANY(SELECT jsonb_array_elements_text(tournament_rec.map_pool))
            AND m.id NOT IN (SELECT map_id FROM map_veto_actions WHERE veto_session_id = p_veto_session_id)
            LIMIT 1;

            IF last_map_id IS NULL THEN
                RETURN 'No remaining map found for auto-pick';
            END IF;

            INSERT INTO map_veto_actions (
                veto_session_id, team_id, map_id, action, order_number, performed_by
            ) VALUES (
                p_veto_session_id, NULL, last_map_id, 'pick'::map_veto_action, current_action_position, NULL
            );

            -- Set turn to home team for side choice
            UPDATE map_veto_sessions SET current_turn_team_id = v_home_team_id WHERE id = p_veto_session_id;
            
            RAISE LOG 'BO1 Veto: Auto-picked map %, home team (%) can now choose side', last_map_id, v_home_team_id;
            RETURN 'OK';
        END IF;
        
        IF expected_team_id::uuid IS DISTINCT FROM p_team_id THEN
            RAISE LOG 'BO1 Veto Validation Failed: Position %, Expected team %, Got team %', 
                current_action_position, expected_team_id, p_team_id;
            RETURN 'It is not your turn in the competitive veto sequence';
        END IF;
        
        veto_action_type := expected_action;

    ELSIF is_bo3 THEN
        -- BO3 LOGIC: Ban-ban-pick-pick-ban-ban-pick (for 7 maps)
        -- Standard competitive sequence: [home ban, away ban, home pick, away pick, away ban, home ban, home pick (decider)]
        veto_sequence := jsonb_build_array(
            jsonb_build_object('team', v_home_team_id, 'action', 'ban'),    -- 1
            jsonb_build_object('team', v_away_team_id, 'action', 'ban'),    -- 2
            jsonb_build_object('team', v_home_team_id, 'action', 'pick'),   -- 3
            jsonb_build_object('team', v_away_team_id, 'action', 'pick'),   -- 4
            jsonb_build_object('team', v_away_team_id, 'action', 'ban'),    -- 5
            jsonb_build_object('team', v_home_team_id, 'action', 'ban'),    -- 6
            jsonb_build_object('team', v_home_team_id, 'action', 'pick')    -- 7 (decider)
        );
        
        RAISE LOG 'BO3 VETO SEQUENCE: Generated sequence for position %', current_action_position;
        
        -- Validate current action position and team
        IF current_action_position > jsonb_array_length(veto_sequence) THEN
            RETURN 'No more actions allowed - BO3 veto sequence complete';
        END IF;
        
        expected_action := (veto_sequence->((current_action_position - 1)))->>'action';
        expected_team_id := (veto_sequence->((current_action_position - 1)))->>'team';
        
        IF expected_team_id::uuid IS DISTINCT FROM p_team_id THEN
            RAISE LOG 'BO3 Veto Validation Failed: Position %, Expected team %, Got team %', 
                current_action_position, expected_team_id, p_team_id;
            RETURN 'It is not your turn in the competitive BO3 veto sequence';
        END IF;
        
        veto_action_type := expected_action;
        
    ELSE
        -- Legacy logic for other formats (BO5, etc.)
        IF total_maps_in_pool - bans_made = 1 THEN
            veto_action_type := 'pick';
        ELSE
            veto_action_type := 'ban';
        END IF;
    END IF;

    -- Insert the veto action
    INSERT INTO map_veto_actions (
        veto_session_id, team_id, map_id, action, order_number, performed_by
    ) VALUES (
        p_veto_session_id, p_team_id, p_map_id, veto_action_type::map_veto_action, current_action_position, p_user_id
    ) RETURNING id INTO inserted_action_id;

    RAISE LOG 'VETO ACTION INSERTED: % % completed by team %, action ID %', 
        veto_action_type, current_action_position, p_team_id, inserted_action_id;

    -- Determine next action for BO1/BO3
    IF is_bo1 OR is_bo3 THEN
        IF current_action_position >= jsonb_array_length(veto_sequence) THEN
            -- Veto complete
            IF is_bo3 THEN
                -- BO3 complete - no side choice needed
                UPDATE map_veto_sessions SET status = 'completed', completed_at = now() WHERE id = p_veto_session_id;
                RAISE LOG 'BO3 Veto: Complete with 3 maps selected';
            ELSE
                -- BO1 complete - waiting for side choice
                RAISE LOG 'BO1 Veto: Complete, waiting for side choice by home team';
            END IF
        ELSE
            -- Move to next action in sequence
            next_team_id := (veto_sequence->(current_action_position))->>'team';
            
            IF next_team_id IS NOT NULL THEN
                UPDATE map_veto_sessions SET current_turn_team_id = next_team_id::uuid WHERE id = p_veto_session_id;
                RAISE LOG 'VETO TURN SWITCH: Position % to % (team %)', current_action_position, current_action_position + 1, next_team_id;
            END IF;
        END IF;
    ELSE
        -- Legacy logic for other formats
        IF total_maps_in_pool - bans_made = 1 THEN
            UPDATE map_veto_sessions SET status = 'completed', completed_at = now() WHERE id = p_veto_session_id;
        ELSE
            opposite_team := CASE WHEN p_team_id = v_team1_id THEN v_team2_id ELSE v_team1_id END;
            UPDATE map_veto_sessions SET current_turn_team_id = opposite_team WHERE id = p_veto_session_id;
        END IF;
    END IF;

    RETURN 'OK';
END;
$$;