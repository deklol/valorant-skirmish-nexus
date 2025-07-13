-- Fix the set_side_choice function to expect 'defend' instead of 'defense'
-- This matches the data we fixed earlier
CREATE OR REPLACE FUNCTION public.set_side_choice(
    p_veto_session_id uuid,
    p_user_id uuid,
    p_side_choice text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    session_rec RECORD;
    match_rec RECORD;
    home_team_id uuid;
    is_home_captain BOOLEAN;
    last_pick_id uuid;
    now_time timestamp with time zone := now();
    normalized_side_choice text;
BEGIN
    -- Normalize side choice to lowercase for comparison
    normalized_side_choice := lower(trim(p_side_choice));
    
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

    -- FIXED: Side can only be 'attack' or 'defend' (matches our data fix)
    IF normalized_side_choice NOT IN ('attack', 'defend') THEN
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

    -- Update side_choice on that veto action (store normalized value)
    UPDATE map_veto_actions
    SET side_choice = normalized_side_choice, performed_by = p_user_id, performed_at = now_time
    WHERE id = last_pick_id;

    -- Mark veto as completed
    UPDATE map_veto_sessions
    SET status = 'completed', completed_at = now_time
    WHERE id = p_veto_session_id;

    RETURN 'OK';
END;
$$;