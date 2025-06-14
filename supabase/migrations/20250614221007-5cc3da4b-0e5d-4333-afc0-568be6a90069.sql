
-- 1. Function: Check if a user belongs to a team
CREATE OR REPLACE FUNCTION public.is_user_on_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = p_user_id
      AND team_id = p_team_id
  );
$$;

-- 2. FUNCTION: Validate and perform a map veto action, atomically
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
    is_on_team BOOLEAN;
    bans_made INT;
    total_bans_needed INT;
    remaining_maps INT;
    veto_action_type TEXT;
    opposite_team uuid;
    inserted_action_id uuid;
BEGIN
    -- 1. Validate veto session
    SELECT * INTO session_rec FROM map_veto_sessions WHERE id = p_veto_session_id;
    IF session_rec IS NULL THEN
        RETURN 'Veto session does not exist';
    END IF;

    IF session_rec.status IS DISTINCT FROM 'in_progress' THEN
        RETURN 'Veto session not in progress';
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

    -- 5. Insert action
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
        veto_action_type,
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
        IF p_team_id = session_rec.team1_id THEN
            opposite_team := session_rec.team2_id;
        ELSE
            opposite_team := session_rec.team1_id;
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
            'pick',
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
        IF p_team_id = session_rec.team1_id THEN
            opposite_team := session_rec.team2_id;
        ELSE
            opposite_team := session_rec.team1_id;
        END IF;
        UPDATE map_veto_sessions
        SET current_turn_team_id = opposite_team
        WHERE id = p_veto_session_id;
    END IF;

    RETURN 'OK';
END;
$$;

-- 3. (Optional) Mark function as SECURITY DEFINER for stricter security (if using RLS)

-- 4. Add function for permission checks (server-side)
CREATE OR REPLACE FUNCTION public.can_user_perform_veto(
    p_veto_session_id uuid,
    p_user_id uuid,
    p_team_id uuid
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    session_rec RECORD;
    is_on_team BOOLEAN;
BEGIN
    SELECT * INTO session_rec FROM map_veto_sessions WHERE id = p_veto_session_id;
    IF session_rec IS NULL THEN
        RETURN 'No such veto session';
    END IF;
    is_on_team := public.is_user_on_team(p_user_id, p_team_id);
    IF NOT is_on_team THEN
        RETURN 'User is not on this team';
    END IF;
    IF session_rec.current_turn_team_id IS DISTINCT FROM p_team_id THEN
        RETURN 'It is not your team''s turn';
    END IF;
    RETURN 'OK';
END;
$$;

-- 5. (Optional) Use TRANSACTION blocks for more atomicity (handled by plpgsql by default)
