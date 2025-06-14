
-- Add new profile fields to users table
ALTER TABLE public.users 
ADD COLUMN bio text,
ADD COLUMN twitter_handle text,
ADD COLUMN twitch_handle text,
ADD COLUMN discord_avatar_url text,
ADD COLUMN profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private')),
ADD COLUMN last_seen timestamp with time zone DEFAULT now();

-- Create function to get user profile data (respects privacy settings)
CREATE OR REPLACE FUNCTION public.get_user_profile(profile_user_id uuid)
RETURNS TABLE (
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
  peak_rank text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
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
    u.peak_rank
  FROM public.users u
  WHERE u.id = profile_user_id;
$$;

-- Create function to get user match history through team memberships
CREATE OR REPLACE FUNCTION public.get_user_match_history(profile_user_id uuid, match_limit integer DEFAULT 10)
RETURNS TABLE (
  match_id uuid,
  tournament_name text,
  match_date timestamp with time zone,
  team_name text,
  opponent_team_name text,
  user_team_score integer,
  opponent_team_score integer,
  is_winner boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    m.id as match_id,
    t.name as tournament_name,
    m.completed_at as match_date,
    user_team.name as team_name,
    opponent_team.name as opponent_team_name,
    CASE 
      WHEN tm.team_id = m.team1_id THEN m.score_team1
      ELSE m.score_team2
    END as user_team_score,
    CASE 
      WHEN tm.team_id = m.team1_id THEN m.score_team2
      ELSE m.score_team1
    END as opponent_team_score,
    (tm.team_id = m.winner_id) as is_winner
  FROM public.team_members tm
  JOIN public.teams user_team ON tm.team_id = user_team.id
  JOIN public.matches m ON (tm.team_id = m.team1_id OR tm.team_id = m.team2_id)
  JOIN public.tournaments t ON m.tournament_id = t.id
  LEFT JOIN public.teams opponent_team ON (
    CASE 
      WHEN tm.team_id = m.team1_id THEN m.team2_id
      ELSE m.team1_id
    END = opponent_team.id
  )
  WHERE tm.user_id = profile_user_id
    AND m.status = 'completed'
    AND (
      -- Show if profile is public, or if viewing own profile, or if user is admin
      (SELECT profile_visibility FROM public.users WHERE id = profile_user_id) = 'public'
      OR profile_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
  ORDER BY m.completed_at DESC
  LIMIT match_limit;
$$;

-- Create function to get user tournament history
CREATE OR REPLACE FUNCTION public.get_user_tournament_history(profile_user_id uuid)
RETURNS TABLE (
  tournament_id uuid,
  tournament_name text,
  tournament_date timestamp with time zone,
  team_name text,
  team_status text,
  placement text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    t.id as tournament_id,
    t.name as tournament_name,
    t.start_time as tournament_date,
    teams.name as team_name,
    teams.status::text as team_status,
    CASE 
      WHEN teams.status = 'winner' THEN '1st Place'
      WHEN teams.status = 'eliminated' THEN 'Eliminated'
      ELSE 'Participated'
    END as placement
  FROM public.team_members tm
  JOIN public.teams teams ON tm.team_id = teams.id
  JOIN public.tournaments t ON teams.tournament_id = t.id
  WHERE tm.user_id = profile_user_id
    AND (
      -- Show if profile is public, or if viewing own profile, or if user is admin
      (SELECT profile_visibility FROM public.users WHERE id = profile_user_id) = 'public'
      OR profile_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
  ORDER BY t.start_time DESC;
$$;

-- Add trigger to update last_seen when users perform actions
CREATE OR REPLACE FUNCTION public.update_user_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users 
  SET last_seen = now() 
  WHERE id = auth.uid();
  RETURN COALESCE(NEW, OLD);
END;
$$;
