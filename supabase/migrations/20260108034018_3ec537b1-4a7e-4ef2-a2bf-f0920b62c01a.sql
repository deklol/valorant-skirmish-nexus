-- Step 1: Clean up duplicate matches
-- Keep the match with winner_id set, or most recently updated
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY tournament_id, round_number, match_number
      ORDER BY 
        CASE WHEN winner_id IS NOT NULL THEN 0 ELSE 1 END,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST
    ) as rn
  FROM matches
)
DELETE FROM matches 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE matches
ADD CONSTRAINT matches_tournament_round_match_unique 
UNIQUE (tournament_id, round_number, match_number);