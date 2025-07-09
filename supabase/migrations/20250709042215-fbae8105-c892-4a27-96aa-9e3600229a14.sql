-- Create achievements system tables
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- lucide icon name
  category TEXT NOT NULL DEFAULT 'general', -- 'tournament', 'match', 'participation', 'streak', 'general'
  requirement_type TEXT NOT NULL, -- 'total_wins', 'tournament_wins', 'win_streak', 'participation_streak', etc.
  requirement_value INTEGER NOT NULL,
  requirement_metadata JSONB DEFAULT '{}',
  points INTEGER NOT NULL DEFAULT 10, -- achievement points for leaderboard
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user achievements tracking table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress_data JSONB DEFAULT '{}', -- store streak counts, etc.
  UNIQUE(user_id, achievement_id)
);

-- Create achievement progress tracking table for complex achievements
CREATE TABLE public.user_achievement_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  current_value INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points, rarity) VALUES
-- Tournament achievements
('First Victory', 'Win your first tournament', 'Trophy', 'tournament', 'tournament_wins', 1, 25, 'common'),
('Tournament Champion', 'Win 5 tournaments', 'Crown', 'tournament', 'tournament_wins', 5, 100, 'rare'),
('Tournament Legend', 'Win 10 tournaments', 'Star', 'tournament', 'tournament_wins', 10, 250, 'epic'),
('Tournament God', 'Win 25 tournaments', 'Zap', 'tournament', 'tournament_wins', 25, 500, 'legendary'),

-- Match achievements  
('First Win', 'Win your first match', 'Target', 'match', 'total_wins', 1, 10, 'common'),
('Skilled Player', 'Win 25 matches', 'Sword', 'match', 'total_wins', 25, 50, 'common'),
('Expert Player', 'Win 100 matches', 'Shield', 'match', 'total_wins', 100, 150, 'rare'),
('Master Player', 'Win 250 matches', 'Medal', 'match', 'total_wins', 250, 300, 'epic'),

-- Participation achievements
('Tournament Regular', 'Participate in 10 tournaments', 'Calendar', 'participation', 'tournaments_played', 10, 75, 'common'),
('Tournament Veteran', 'Participate in 25 tournaments', 'Users', 'participation', 'tournaments_played', 25, 150, 'rare'),
('Community Pillar', 'Participate in 50 tournaments', 'Heart', 'participation', 'tournaments_played', 50, 300, 'epic'),

-- Win rate achievements
('Consistent Winner', 'Maintain 75%+ win rate with 20+ matches', 'TrendingUp', 'general', 'win_rate_75', 20, 200, 'rare'),
('Unstoppable', 'Maintain 90%+ win rate with 10+ matches', 'Flame', 'general', 'win_rate_90', 10, 400, 'legendary');

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievement_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage achievements" ON achievements FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for user achievements
CREATE POLICY "Users can view all user achievements" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "System can insert user achievements" ON user_achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their achievement progress" ON user_achievement_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage achievement progress" ON user_achievement_progress FOR ALL WITH CHECK (true);

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id UUID)
RETURNS TABLE(newly_earned_achievement_id UUID, achievement_name TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_stats RECORD;
  achievement_rec RECORD;
  win_rate DECIMAL;
  total_matches INTEGER;
BEGIN
  -- Get user statistics
  SELECT wins, losses, tournaments_played, tournaments_won, mvp_awards
  INTO user_stats
  FROM users WHERE id = p_user_id;
  
  IF user_stats IS NULL THEN
    RETURN;
  END IF;

  total_matches := COALESCE(user_stats.wins, 0) + COALESCE(user_stats.losses, 0);
  
  -- Calculate win rate if user has matches
  IF total_matches > 0 THEN
    win_rate := (COALESCE(user_stats.wins, 0)::DECIMAL / total_matches) * 100;
  ELSE
    win_rate := 0;
  END IF;

  -- Check each achievement
  FOR achievement_rec IN SELECT * FROM achievements WHERE is_active = true LOOP
    -- Skip if user already has this achievement
    IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = achievement_rec.id) THEN
      CONTINUE;
    END IF;

    -- Check achievement requirements
    CASE achievement_rec.requirement_type
      WHEN 'tournament_wins' THEN
        IF COALESCE(user_stats.tournaments_won, 0) >= achievement_rec.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
        
      WHEN 'total_wins' THEN
        IF COALESCE(user_stats.wins, 0) >= achievement_rec.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
        
      WHEN 'tournaments_played' THEN
        IF COALESCE(user_stats.tournaments_played, 0) >= achievement_rec.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
        
      WHEN 'win_rate_75' THEN
        IF total_matches >= achievement_rec.requirement_value AND win_rate >= 75 THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
        
      WHEN 'win_rate_90' THEN
        IF total_matches >= achievement_rec.requirement_value AND win_rate >= 90 THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
    END CASE;
  END LOOP;
END;
$$;

-- Trigger to check achievements when user stats change
CREATE OR REPLACE FUNCTION public.trigger_achievement_check()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only check if relevant stats changed
  IF (OLD.wins IS DISTINCT FROM NEW.wins) OR 
     (OLD.losses IS DISTINCT FROM NEW.losses) OR
     (OLD.tournaments_played IS DISTINCT FROM NEW.tournaments_played) OR
     (OLD.tournaments_won IS DISTINCT FROM NEW.tournaments_won) THEN
    
    -- Check achievements asynchronously to avoid blocking the main operation
    PERFORM check_and_award_achievements(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on users table
CREATE TRIGGER trigger_check_achievements_on_user_update
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_achievement_check();

-- Function to get user achievement summary
CREATE OR REPLACE FUNCTION public.get_user_achievement_summary(p_user_id UUID)
RETURNS TABLE(
  total_achievements INTEGER,
  total_points INTEGER,
  latest_achievement_name TEXT,
  latest_achievement_date TIMESTAMP WITH TIME ZONE,
  achievement_rank INTEGER
)
LANGUAGE sql
STABLE
AS $$
  WITH user_achievements_summary AS (
    SELECT 
      COUNT(*) as total_count,
      COALESCE(SUM(a.points), 0) as total_pts
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = p_user_id
  ),
  latest_achievement AS (
    SELECT a.name, ua.earned_at
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = p_user_id
    ORDER BY ua.earned_at DESC
    LIMIT 1
  ),
  user_ranking AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY SUM(a.points) DESC, MIN(ua.earned_at) ASC) as rank
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = p_user_id
    GROUP BY ua.user_id
  )
  SELECT 
    uas.total_count::INTEGER,
    uas.total_pts::INTEGER,
    la.name,
    la.earned_at,
    ur.rank::INTEGER
  FROM user_achievements_summary uas
  LEFT JOIN latest_achievement la ON true
  LEFT JOIN user_ranking ur ON true;
$$;