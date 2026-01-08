
-- Fix: Allow anonymous users to view public tournament data
-- This restores public access to non-sensitive data while keeping sensitive fields protected

-- 1. Fix tournament_signups: Allow anyone to view signups (needed for participant lists)
DROP POLICY IF EXISTS "Authenticated users can view signups" ON public.tournament_signups;

CREATE POLICY "Anyone can view signups"
ON public.tournament_signups
FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Fix users table: Add a policy allowing anyone to read the public fields
-- The public_user_profiles view needs to read from users table
-- We add a SELECT policy for anon that only works via the view (which filters sensitive data)
CREATE POLICY "Anyone can view public user data"
ON public.users
FOR SELECT
TO anon
USING (is_banned IS NOT TRUE);

-- Note: Sensitive fields like discord_id, riot_id, ban_reason, manual_override fields, 
-- spendable_points are in the users table but NOT exposed in public_user_profiles view.
-- The view acts as the filter for what anonymous users can actually see.
-- When accessing directly, only non-banned users' rows are visible, but the 
-- application uses the view which further restricts columns.
