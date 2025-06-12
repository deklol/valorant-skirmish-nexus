
-- Create rank_history table to track user rank changes over time
CREATE TABLE public.rank_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  previous_rank TEXT,
  new_rank TEXT NOT NULL,
  rank_change_type TEXT NOT NULL CHECK (rank_change_type IN ('promotion', 'demotion', 'same')),
  rank_points_change INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_rank_history_user_id ON public.rank_history(user_id);
CREATE INDEX idx_rank_history_updated_at ON public.rank_history(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own rank history" 
  ON public.rank_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert rank history" 
  ON public.rank_history 
  FOR INSERT 
  WITH CHECK (true);

-- Create function to automatically track rank changes
CREATE OR REPLACE FUNCTION public.track_rank_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if rank actually changed
  IF OLD.current_rank IS DISTINCT FROM NEW.current_rank THEN
    INSERT INTO public.rank_history (
      user_id,
      previous_rank,
      new_rank,
      rank_change_type,
      rank_points_change
    ) VALUES (
      NEW.id,
      OLD.current_rank,
      NEW.current_rank,
      CASE
        WHEN OLD.rank_points < NEW.rank_points THEN 'promotion'
        WHEN OLD.rank_points > NEW.rank_points THEN 'demotion'
        ELSE 'same'
      END,
      COALESCE(NEW.rank_points, 0) - COALESCE(OLD.rank_points, 0)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically track rank changes
CREATE TRIGGER trigger_track_rank_change
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.track_rank_change();
