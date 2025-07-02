-- Add substitute/waitlist system to tournament_signups table
ALTER TABLE tournament_signups 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for efficient substitute queries
CREATE INDEX IF NOT EXISTS idx_tournament_signups_substitute_priority 
ON tournament_signups(tournament_id, is_substitute, priority) 
WHERE is_substitute = true;

-- Update RLS policies to handle substitutes
DROP POLICY IF EXISTS "Users can manage own signups" ON tournament_signups;

CREATE POLICY "Users can manage own signups and substitutes" 
ON tournament_signups 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Function to get next available substitute for a tournament
CREATE OR REPLACE FUNCTION public.get_next_substitute(p_tournament_id UUID)
RETURNS TABLE(
  user_id UUID,
  discord_username TEXT,
  current_rank TEXT,
  riot_id TEXT,
  rank_points INTEGER,
  priority INTEGER
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    ts.user_id,
    u.discord_username,
    u.current_rank,
    u.riot_id,
    u.rank_points,
    ts.priority
  FROM tournament_signups ts
  JOIN users u ON ts.user_id = u.id
  WHERE ts.tournament_id = p_tournament_id
    AND ts.is_substitute = true
    AND ts.available = true
  ORDER BY ts.priority ASC, ts.signed_up_at ASC
  LIMIT 1;
$$;

-- Function to promote substitute to main player
CREATE OR REPLACE FUNCTION public.promote_substitute_to_player(
  p_tournament_id UUID,
  p_substitute_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tournament_rec RECORD;
  substitute_rec RECORD;
  current_signups INTEGER;
BEGIN
  -- Get tournament info
  SELECT * INTO tournament_rec FROM tournaments WHERE id = p_tournament_id;
  IF tournament_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Get substitute info
  SELECT * INTO substitute_rec 
  FROM tournament_signups 
  WHERE tournament_id = p_tournament_id 
    AND user_id = p_substitute_user_id 
    AND is_substitute = true 
    AND available = true;
    
  IF substitute_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Available substitute not found');
  END IF;

  -- Check if tournament has space
  SELECT COUNT(*) INTO current_signups 
  FROM tournament_signups 
  WHERE tournament_id = p_tournament_id AND is_substitute = false;
  
  IF current_signups >= tournament_rec.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is full');
  END IF;

  -- Promote substitute to main player
  UPDATE tournament_signups 
  SET 
    is_substitute = false,
    priority = 0,
    available = true,
    notes = COALESCE(notes, '') || ' | Promoted from substitute'
  WHERE tournament_id = p_tournament_id 
    AND user_id = p_substitute_user_id;

  -- Log the promotion
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'tournament_signups',
    'SUBSTITUTE_PROMOTION',
    substitute_rec.id,
    auth.uid(),
    jsonb_build_object(
      'tournament_id', p_tournament_id,
      'promoted_user_id', p_substitute_user_id,
      'promotion_timestamp', now()
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Substitute promoted to main player successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;