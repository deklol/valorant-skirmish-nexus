
-- Remove the 'end_time' column from the tournaments table
ALTER TABLE public.tournaments
  DROP COLUMN IF EXISTS end_time;
