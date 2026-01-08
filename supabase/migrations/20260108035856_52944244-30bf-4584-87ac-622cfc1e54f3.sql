
-- Fix tournament_signups table security
-- Remove overly permissive public SELECT policy and replace with authenticated-only access

-- Drop the problematic policy that allows anyone to view signups
DROP POLICY IF EXISTS "Anyone can view signups" ON public.tournament_signups;

-- Create new policy: Authenticated users can view signups for tournaments they have access to
-- This allows viewing signups for any tournament (needed for registration counts, participant lists)
-- but restricts to authenticated users only
CREATE POLICY "Authenticated users can view signups"
ON public.tournament_signups
FOR SELECT
TO authenticated
USING (true);

-- Note: The 'notes' field that may contain personal info is now only accessible to authenticated users
-- Combined with the users table fix that created public_user_profiles view, 
-- this prevents anonymous scraping of player data
