
-- Add fields to support dice rolling and home/away tracking in veto sessions
ALTER TABLE public.map_veto_sessions
  ADD COLUMN home_team_id uuid,
  ADD COLUMN away_team_id uuid,
  ADD COLUMN roll_seed text,
  ADD COLUMN roll_initiator_id uuid,
  ADD COLUMN roll_timestamp timestamp with time zone;

-- Optionally, add a CHECK to ensure home != away if both present
ALTER TABLE public.map_veto_sessions
  ADD CONSTRAINT home_away_not_equal CHECK (
    home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id
  );
