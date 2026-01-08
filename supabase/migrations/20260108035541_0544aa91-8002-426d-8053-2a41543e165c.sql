-- First, check if we already have the admin check function, if not create it
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = _user_id
      AND role = 'admin'
  )
$$;

-- Drop the overly permissive policy that exposes all data
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;

-- Create policy: Users can always view their own full profile
CREATE POLICY "Users can view own full profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy: Admins can view all user data
CREATE POLICY "Admins can view all user data"
ON public.users
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create a secure view for public profile data that anyone can access
-- This exposes ONLY safe public fields, not sensitive data
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT 
  id,
  discord_username,
  discord_avatar_url,
  current_rank,
  rank_points,
  peak_rank,
  weight_rating,
  tournaments_played,
  tournaments_won,
  mvp_awards,
  wins,
  losses,
  bio,
  twitter_handle,
  twitch_handle,
  valorant_agent,
  valorant_role,
  status_message,
  looking_for_team,
  is_phantom,
  created_at,
  -- Expose role only as boolean for admin badge display
  CASE WHEN role = 'admin' THEN true ELSE false END as is_admin_user
FROM public.users
WHERE is_banned IS NOT TRUE;

-- Grant access to the public view
GRANT SELECT ON public.public_user_profiles TO anon, authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.public_user_profiles IS 'Public-safe user profile data. Does not expose: discord_id, riot_id, ban details, IP tracking, manual overrides, spendable points, or other sensitive fields.';