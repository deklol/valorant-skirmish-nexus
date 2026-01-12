-- Add group stage support to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS group_stage_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS group_count integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS group_stage_format text DEFAULT 'round_robin' CHECK (group_stage_format IN ('round_robin', 'swiss')),
ADD COLUMN IF NOT EXISTS teams_advance_per_group integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS group_stage_completed boolean DEFAULT false;

-- Add group assignment to teams table
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS group_number integer DEFAULT NULL;

-- Create index for group queries
CREATE INDEX IF NOT EXISTS idx_teams_group_number ON public.teams(tournament_id, group_number) WHERE group_number IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tournaments.group_stage_enabled IS 'Whether tournament uses group stage before knockout';
COMMENT ON COLUMN public.tournaments.group_count IS 'Number of groups (2-8)';
COMMENT ON COLUMN public.tournaments.group_stage_format IS 'Format within groups: round_robin or swiss';
COMMENT ON COLUMN public.tournaments.teams_advance_per_group IS 'How many teams from each group advance (1-4)';
COMMENT ON COLUMN public.tournaments.group_stage_completed IS 'Whether group stage is complete and knockout generated';
COMMENT ON COLUMN public.teams.group_number IS 'Group assignment for group stage tournaments (1, 2, 3, etc.)';