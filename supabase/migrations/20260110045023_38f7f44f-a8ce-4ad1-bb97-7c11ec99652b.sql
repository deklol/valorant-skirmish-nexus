-- Add swiss_rounds column for Swiss format tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS swiss_rounds integer DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.tournaments.swiss_rounds IS 'Number of rounds for Swiss format tournaments. NULL means auto-calculate based on team count.';