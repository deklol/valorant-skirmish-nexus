-- =====================================================
-- FACEIT CS2 INTEGRATION
-- Add steam_url to users and create faceit_stats table
-- =====================================================

-- Add steam_url column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS steam_url TEXT;

-- Create faceit_stats table to store fetched FACEIT data
CREATE TABLE IF NOT EXISTS public.faceit_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  steam_url TEXT NOT NULL,
  
  -- FACEIT profile data
  faceit_player_id TEXT,
  faceit_nickname TEXT,
  faceit_country TEXT,
  faceit_avatar TEXT,
  faceit_verified BOOLEAN DEFAULT FALSE,
  faceit_activated_at TIMESTAMPTZ,
  
  -- CS2 specific stats
  cs2_skill_level INTEGER,
  cs2_elo INTEGER,
  cs2_region TEXT,
  cs2_game_player_id TEXT,
  cs2_game_player_name TEXT,
  
  -- Lifetime stats
  lifetime_matches INTEGER,
  lifetime_wins INTEGER,
  lifetime_win_rate NUMERIC(5,2),
  lifetime_avg_kd NUMERIC(4,2),
  lifetime_avg_headshots_pct NUMERIC(5,2),
  lifetime_longest_win_streak INTEGER,
  lifetime_adr NUMERIC(5,2),
  
  -- Last 30 days stats
  last30_kills NUMERIC(5,2),
  last30_deaths NUMERIC(5,2),
  last30_assists NUMERIC(5,2),
  last30_adr NUMERIC(5,2),
  last30_kd_ratio NUMERIC(4,2),
  last30_headshot_pct NUMERIC(5,2),
  last30_wins INTEGER,
  last30_losses INTEGER,
  
  -- Steam data
  steam_playtime_hours NUMERIC(10,2),
  steam_profile_created_at TIMESTAMPTZ,
  steam_vac_banned BOOLEAN DEFAULT FALSE,
  steam_game_banned BOOLEAN DEFAULT FALSE,
  
  -- FACEIT teams (stored as JSONB)
  faceit_teams JSONB,
  
  -- Metadata
  last_fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one stats row per user
  CONSTRAINT unique_user_faceit_stats UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.faceit_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own stats, public can view if user allows
CREATE POLICY "Users can view their own FACEIT stats"
ON public.faceit_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Public can view FACEIT stats for public profiles"
ON public.faceit_stats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = faceit_stats.user_id 
    AND u.profile_visibility = 'public'
  )
);

CREATE POLICY "Users can insert their own FACEIT stats"
ON public.faceit_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FACEIT stats"
ON public.faceit_stats
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FACEIT stats"
ON public.faceit_stats
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE TRIGGER update_faceit_stats_updated_at
BEFORE UPDATE ON public.faceit_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_faceit_stats_user_id ON public.faceit_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_faceit_stats_faceit_nickname ON public.faceit_stats(faceit_nickname);

-- Add steam_url to the public user profile view/function if needed
COMMENT ON TABLE public.faceit_stats IS 'Stores FACEIT CS2 statistics for users who link their Steam account';
COMMENT ON COLUMN public.faceit_stats.cs2_skill_level IS 'FACEIT skill level 1-10';
COMMENT ON COLUMN public.faceit_stats.cs2_elo IS 'FACEIT ELO rating';