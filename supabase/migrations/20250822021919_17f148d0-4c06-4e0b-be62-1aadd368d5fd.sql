-- Quick Match System Tables
-- Table for tracking active quick match sessions
CREATE TABLE public.quick_match_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_channel_id TEXT NOT NULL,
  discord_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'balancing', 'voting', 'in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  selected_map_id UUID REFERENCES public.maps(id),
  match_id UUID REFERENCES public.matches(id),
  team_a_data JSONB DEFAULT '[]'::jsonb,
  team_b_data JSONB DEFAULT '[]'::jsonb,
  balance_analysis JSONB DEFAULT '{}'::jsonb,
  session_data JSONB DEFAULT '{}'::jsonb
);

-- Table for map voting in quick matches
CREATE TABLE public.quick_match_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quick_match_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  discord_id TEXT NOT NULL,
  map_id UUID NOT NULL REFERENCES public.maps(id),
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.quick_match_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_match_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quick_match_sessions
CREATE POLICY "Anyone can view active sessions" 
ON public.quick_match_sessions 
FOR SELECT 
USING (status IN ('waiting', 'balancing', 'voting', 'in_progress'));

CREATE POLICY "System can manage sessions" 
ON public.quick_match_sessions 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can manage all sessions" 
ON public.quick_match_sessions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND role = 'admin'::user_role
));

-- RLS Policies for quick_match_votes
CREATE POLICY "Anyone can view votes for active sessions" 
ON public.quick_match_votes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quick_match_sessions 
  WHERE id = session_id AND status = 'voting'
));

CREATE POLICY "Users can vote in active sessions" 
ON public.quick_match_votes 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quick_match_sessions 
  WHERE id = session_id AND status = 'voting'
));

CREATE POLICY "System can manage votes" 
ON public.quick_match_votes 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_quick_match_sessions_status ON public.quick_match_sessions(status);
CREATE INDEX idx_quick_match_sessions_channel ON public.quick_match_sessions(discord_channel_id);
CREATE INDEX idx_quick_match_votes_session ON public.quick_match_votes(session_id);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_quick_match_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quick_match_sessions_updated_at
  BEFORE UPDATE ON public.quick_match_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quick_match_sessions_updated_at();