
-- Step 1: Drop existing conflicting policies (by name only, no data drop)
DROP POLICY IF EXISTS "Anyone can view veto actions" ON public.map_veto_actions;
DROP POLICY IF EXISTS "Anyone can view veto sessions" ON public.map_veto_sessions;
DROP POLICY IF EXISTS "Team captains can insert veto if on match team, captain, and turn" ON public.map_veto_actions;
DROP POLICY IF EXISTS "Home team captain can set side_choice" ON public.map_veto_actions;
DROP POLICY IF EXISTS "Admins only can delete veto actions" ON public.map_veto_actions;
DROP POLICY IF EXISTS "Only admins can insert/update/delete veto sessions" ON public.map_veto_sessions;

-- Step 2: Re-create correct RLS policies (copied from earlier approved snippet)
-- Anyone (even unauth) can view for transparency
CREATE POLICY "Anyone can view veto actions" ON public.map_veto_actions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can view veto sessions" ON public.map_veto_sessions
FOR SELECT
USING (true);

-- Team captains of teams in the match, and only on their turn, can INSERT veto actions
CREATE POLICY "Team captains can insert veto if on match team, captain, and turn" ON public.map_veto_actions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM map_veto_sessions session
    JOIN matches m ON session.match_id = m.id
    JOIN team_members tm ON
      (tm.team_id = m.team1_id OR tm.team_id = m.team2_id)
    WHERE
      session.id = map_veto_actions.veto_session_id
      AND tm.user_id = auth.uid()
      AND tm.is_captain = TRUE
      AND tm.team_id = map_veto_actions.team_id
      AND session.current_turn_team_id = map_veto_actions.team_id
  )
);

-- Only the home team captain (for the current session) can update side_choice in the final pick action
CREATE POLICY "Home team captain can set side_choice" ON public.map_veto_actions
FOR UPDATE
TO authenticated
USING (
  (
    action = 'pick'
    AND (
      EXISTS (
        SELECT 1 FROM map_veto_sessions session
        JOIN matches m ON session.match_id = m.id
        JOIN team_members tm ON tm.team_id = session.home_team_id
        WHERE
          session.id = map_veto_actions.veto_session_id
          AND tm.user_id = auth.uid()
          AND tm.is_captain = TRUE
      )
    )
  )
);

-- No one (except DB admins) can delete veto actions via API/UI
CREATE POLICY "Admins only can delete veto actions" ON public.map_veto_actions
FOR DELETE
TO authenticated
USING (false);

-- Only DB admins can insert/update/delete veto sessions, not end-users
CREATE POLICY "Only admins can insert/update/delete veto sessions" ON public.map_veto_sessions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
