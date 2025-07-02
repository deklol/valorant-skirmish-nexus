-- Create analytics tracking tables for tournament page views and user engagement
CREATE TABLE IF NOT EXISTS tournament_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user onboarding progress tracking
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, step_id)
);

-- Create tournament analytics for engagement metrics
CREATE TABLE IF NOT EXISTS tournament_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE tournament_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_page_views
CREATE POLICY "Admins can view all page views" ON tournament_page_views
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "System can insert page views" ON tournament_page_views
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_onboarding_progress
CREATE POLICY "Users can manage their own onboarding progress" ON user_onboarding_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding progress" ON user_onboarding_progress
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- RLS Policies for tournament_analytics
CREATE POLICY "Admins can manage tournament analytics" ON tournament_analytics
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "System can insert analytics" ON tournament_analytics
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_page_views_tournament_id ON tournament_page_views(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_page_views_created_at ON tournament_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_progress_user_id ON user_onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_analytics_tournament_id ON tournament_analytics(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_analytics_metric_type ON tournament_analytics(metric_type);

-- Function to track tournament page views
CREATE OR REPLACE FUNCTION track_tournament_page_view(
  p_tournament_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  view_id UUID;
BEGIN
  INSERT INTO tournament_page_views (
    tournament_id,
    user_id,
    ip_address,
    user_agent,
    referrer
  ) VALUES (
    p_tournament_id,
    p_user_id,
    p_ip_address,
    p_user_agent,
    p_referrer
  ) RETURNING id INTO view_id;
  
  RETURN view_id;
END;
$$;

-- Function to update user onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress(
  p_user_id UUID,
  p_step_id TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_onboarding_progress (user_id, step_id, metadata)
  VALUES (p_user_id, p_step_id, p_metadata)
  ON CONFLICT (user_id, step_id) 
  DO UPDATE SET 
    completed_at = now(),
    metadata = p_metadata;
END;
$$;

-- Function to record tournament analytics
CREATE OR REPLACE FUNCTION record_tournament_metric(
  p_tournament_id UUID,
  p_metric_type TEXT,
  p_metric_value NUMERIC DEFAULT 1,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO tournament_analytics (
    tournament_id,
    metric_type,
    metric_value,
    metadata
  ) VALUES (
    p_tournament_id,
    p_metric_type,
    p_metric_value,
    p_metadata
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$;