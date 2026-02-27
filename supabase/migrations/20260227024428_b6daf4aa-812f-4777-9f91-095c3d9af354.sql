-- Table to store Valorant ranked stats scraped from tracker.gg via Firecrawl
CREATE TABLE valorant_tracker_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) UNIQUE,
  
  -- Rank info
  current_rank text,
  current_rr integer,
  peak_rank text,
  peak_rank_act text,
  
  -- Overall competitive stats
  win_rate numeric,
  wins integer,
  losses integer,
  kd_ratio numeric,
  kda_ratio numeric,
  headshot_pct numeric,
  avg_damage_per_round numeric,
  avg_combat_score numeric,
  kills_per_round numeric,
  first_bloods_per_round numeric,
  
  -- Top agents (jsonb array: [{name, games, win_rate, kd}])
  top_agents jsonb DEFAULT '[]'::jsonb,
  
  -- Top weapons (jsonb array: [{name, headshot_pct, kills}])
  top_weapons jsonb DEFAULT '[]'::jsonb,
  
  -- Raw scraped data for debugging
  raw_scrape_data jsonb,
  
  -- The tracker.gg URL that was scraped
  tracker_url text,
  
  -- Metadata
  last_fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE valorant_tracker_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can view stats for public profiles
CREATE POLICY "Public can view tracker stats for public profiles"
  ON valorant_tracker_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = valorant_tracker_stats.user_id
      AND u.profile_visibility = 'public'
    )
  );

-- Users can view their own stats
CREATE POLICY "Users can view their own tracker stats"
  ON valorant_tracker_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own stats
CREATE POLICY "Users can insert their own tracker stats"
  ON valorant_tracker_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stats
CREATE POLICY "Users can update their own tracker stats"
  ON valorant_tracker_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage all stats
CREATE POLICY "Admins can manage tracker stats"
  ON valorant_tracker_stats FOR ALL
  USING (get_user_role(auth.uid()) = 'admin'::user_role);