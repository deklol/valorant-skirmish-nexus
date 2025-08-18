-- Update get_user_profile function to include new social profile fields
DROP FUNCTION IF EXISTS public.get_user_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_user_profile(profile_user_id uuid)
RETURNS TABLE(
  id uuid, 
  discord_username text, 
  riot_id text, 
  current_rank text, 
  rank_points integer, 
  wins integer, 
  losses integer, 
  tournaments_played integer, 
  tournaments_won integer, 
  mvp_awards integer, 
  bio text, 
  twitter_handle text, 
  twitch_handle text, 
  discord_avatar_url text, 
  profile_visibility text, 
  last_seen timestamp with time zone, 
  created_at timestamp with time zone, 
  peak_rank text, 
  role text,
  valorant_agent text,
  valorant_role valorant_role,
  status_message text,
  looking_for_team boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT 
    u.id,
    u.discord_username,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.riot_id
    END as riot_id,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.current_rank
    END as current_rank,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.rank_points
    END as rank_points,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.wins
    END as wins,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.losses
    END as losses,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.tournaments_played
    END as tournaments_played,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.tournaments_won
    END as tournaments_won,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.mvp_awards
    END as mvp_awards,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.bio
    END as bio,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.twitter_handle
    END as twitter_handle,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.twitch_handle
    END as twitch_handle,
    u.discord_avatar_url,
    u.profile_visibility,
    u.last_seen,
    u.created_at,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.peak_rank
    END as peak_rank,
    u.role,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.valorant_agent
    END as valorant_agent,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.valorant_role
    END as valorant_role,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.status_message
    END as status_message,
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.looking_for_team
    END as looking_for_team
  FROM users u
  WHERE u.id = profile_user_id;
$function$;