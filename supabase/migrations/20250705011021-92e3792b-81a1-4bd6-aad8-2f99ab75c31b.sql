-- Fix 1: Update is_user_on_team to allow any team member for solo tournaments
-- Solo tournaments should allow any team member to perform veto actions
CREATE OR REPLACE FUNCTION public.is_user_on_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    -- Check if user is a member of the team (any member, not just captain)
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
  );
$$;

-- Fix 2: Update RLS policies to allow proper veto session updates
-- Drop the overly restrictive policy that blocks all session updates
DROP POLICY IF EXISTS "Only admins can insert/update/delete veto sessions" ON public.map_veto_sessions;

-- Create more nuanced policies
CREATE POLICY "Admins can manage all veto sessions" ON public.map_veto_sessions
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Allow system/function updates for turn progression
CREATE POLICY "Allow system updates for veto progression" ON public.map_veto_sessions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Keep read access open for transparency
CREATE POLICY "Anyone can view veto sessions" ON public.map_veto_sessions
FOR SELECT
USING (true);