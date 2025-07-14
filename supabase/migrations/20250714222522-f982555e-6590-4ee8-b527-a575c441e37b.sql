-- Drop and recreate get_user_profile function to include role field
DROP FUNCTION public.get_user_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_user_profile(profile_user_id uuid)
 RETURNS TABLE(id uuid, discord_username text, riot_id text, current_rank text, rank_points integer, wins integer, losses integer, tournaments_played integer, tournaments_won integer, mvp_awards integer, bio text, twitter_handle text, twitch_handle text, discord_avatar_url text, profile_visibility text, last_seen timestamp with time zone, created_at timestamp with time zone, peak_rank text, role text)
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
    u.current_rank,
    u.rank_points,
    u.wins,
    u.losses,
    u.tournaments_played,
    u.tournaments_won,
    u.mvp_awards,
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
    CASE 
      WHEN u.profile_visibility = 'private' AND u.id != auth.uid() THEN NULL
      ELSE u.last_seen
    END as last_seen,
    u.created_at,
    u.peak_rank,
    u.role::text
  FROM public.users u
  WHERE u.id = profile_user_id;
$function$;