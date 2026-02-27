-- Add tracker score columns to valorant_tracker_stats
ALTER TABLE valorant_tracker_stats
  ADD COLUMN IF NOT EXISTS tracker_score integer,
  ADD COLUMN IF NOT EXISTS tracker_score_max integer DEFAULT 1000;