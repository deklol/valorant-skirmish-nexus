
-- Fix the public_user_profiles view to use SECURITY INVOKER
-- This ensures RLS policies of the querying user are applied, not the view creator

-- Drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.public_user_profiles;

CREATE VIEW public.public_user_profiles 
WITH (security_invoker = true)
AS
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
COMMENT ON VIEW public.public_user_profiles IS 'Public-safe user profile data with SECURITY INVOKER. Does not expose: discord_id, riot_id, ban details, IP tracking, manual overrides, spendable points, or other sensitive fields.';
