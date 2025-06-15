
-- Add column to record side choices (attack/defend) per veto action (typically only needed for "pick" actions)
ALTER TABLE public.map_veto_actions
  ADD COLUMN side_choice text;
