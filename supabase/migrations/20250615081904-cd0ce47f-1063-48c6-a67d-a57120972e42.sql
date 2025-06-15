
-- Patch perform_veto_action so it does not expect team1_id/team2_id on sessions
-- but instead pulls teams from the associated match!

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
    team1_id uuid;
    team2_id uuid;
    is_on_team BOOLEAN;
    bans_made INT;
    total_bans_needed INT;
    remaining_maps INT;
    veto_action_type TEXT;
    opposite_team uuid;
    inserted_action_id uuid;
BEGIN
    -- 1. Validate veto session, get session record
    SELECT * INTO session_rec FROM map_veto_sessions WHERE id = p_veto_session_id;
    IF session_rec IS NULL THEN
        RETURN 'Veto session does not exist';
    END IF;

    IF session_rec.status IS DISTINCT FROM 'in_progress' THEN
        RETURN 'Veto session not in progress';
    END IF;

    -- Lookup the related match to get team1_id and team2_id
    IF session_rec.match_id IS NULL THEN
        RETURN 'Veto session does not have a valid match_id';
    END IF;
    SELECT * INTO match_rec FROM matches WHERE id = session_rec.match_id;
    IF match_rec IS NULL THEN
        RETURN 'Match not found for session';
    END IF;

    team1_id := match_rec.team1_id;
    team2_id := match_rec.team2_id;

    IF team1_id IS NULL OR team2_id IS NULL THEN
        RETURN 'Both teams must be assigned for veto';
    END IF;

    -- 2. Validate user is on team and team's turn
    is_on_team := public.is_user_on_team(p_user_id, p_team_id);
    IF NOT is_on_team THEN
        RETURN 'User is not a member of this team';
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

    -- 4. Determine action type and veto status
    bans_made := (SELECT COUNT(*) FROM map_veto_actions WHERE veto_session_id = p_veto_session_id AND action = 'ban');
    total_bans_needed := (SELECT COUNT(*) FROM maps WHERE is_active = TRUE) - 1;
    remaining_maps := total_bans_needed + 1 - bans_made;

    -- "ban" phase unless only one map remains, then "pick"
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

    -- 6. If this action completes veto (last ban), auto-pick remaining map for other team and complete session
    IF total_bans_needed = bans_made AND remaining_maps = 1 THEN
        -- Find the remaining map
        PERFORM id FROM maps WHERE is_active = TRUE
            AND id NOT IN (SELECT map_id FROM map_veto_actions WHERE veto_session_id = p_veto_session_id);

        -- Switch to the other team
        IF p_team_id = team1_id THEN
            opposite_team := team2_id;
        ELSE
            opposite_team := team1_id;
        END IF;

        -- Do auto-pick
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

        -- Mark veto completed
        UPDATE map_veto_sessions
        SET status = 'completed',
            completed_at = now()
        WHERE id = p_veto_session_id;
    ELSE
        -- Switch turn to other team if not completed
        IF p_team_id = team1_id THEN
            opposite_team := team2_id;
        ELSE
            opposite_team := team1_id;
        END IF;
        UPDATE map_veto_sessions
        SET current_turn_team_id = opposite_team
        WHERE id = p_veto_session_id;
    END IF;

    RETURN 'OK';
END;
$$;
