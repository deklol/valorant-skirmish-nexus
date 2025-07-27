-- Add adaptive weight support to tournaments and create tracking table
-- This migration adds the adaptive weight feature while maintaining backward compatibility

-- Add adaptive weight flag to tournaments table
ALTER TABLE tournaments 
ADD COLUMN enable_adaptive_weights boolean DEFAULT false;

-- Create table to store tournament-specific adaptive weight calculations
CREATE TABLE tournament_adaptive_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_rank text,
  peak_rank text,
  current_rank_points integer NOT NULL DEFAULT 150,
  peak_rank_points integer NOT NULL DEFAULT 150,
  adaptive_factor decimal(3,2) NOT NULL DEFAULT 0.5,
  calculated_adaptive_weight integer NOT NULL DEFAULT 150,
  weight_source text NOT NULL DEFAULT 'adaptive_weight',
  calculation_reasoning text,
  rank_decay_factor decimal(3,2),
  time_since_peak_days integer,
  manual_override_applied boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(tournament_id, user_id)
);

-- Enable RLS on the new table
ALTER TABLE tournament_adaptive_weights ENABLE ROW LEVEL SECURITY;

-- Admins can manage all adaptive weight records
CREATE POLICY "Admins can manage tournament adaptive weights"
ON tournament_adaptive_weights FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Anyone can view adaptive weight records for transparency
CREATE POLICY "Anyone can view tournament adaptive weights"
ON tournament_adaptive_weights FOR SELECT
USING (true);

-- Add index for performance
CREATE INDEX idx_tournament_adaptive_weights_tournament_user 
ON tournament_adaptive_weights(tournament_id, user_id);

-- Add updated_at trigger
CREATE TRIGGER update_tournament_adaptive_weights_updated_at
  BEFORE UPDATE ON tournament_adaptive_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();