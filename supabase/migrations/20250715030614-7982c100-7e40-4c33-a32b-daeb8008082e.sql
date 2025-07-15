-- Add balance_analysis field to tournaments table to store auto-balance transparency data
ALTER TABLE tournaments 
ADD COLUMN balance_analysis jsonb DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN tournaments.balance_analysis IS 'Stores auto-balance analysis data including steps, reasoning, quality metrics, and team assignments for transparency display';