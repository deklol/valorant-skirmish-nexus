
-- Fix existing user weight ratings by recalculating them based on current_rank
UPDATE users 
SET weight_rating = CASE 
  WHEN current_rank = 'Iron 1' THEN 10
  WHEN current_rank = 'Iron 2' THEN 15
  WHEN current_rank = 'Iron 3' THEN 20
  WHEN current_rank = 'Bronze 1' THEN 25
  WHEN current_rank = 'Bronze 2' THEN 30
  WHEN current_rank = 'Bronze 3' THEN 35
  WHEN current_rank = 'Silver 1' THEN 40
  WHEN current_rank = 'Silver 2' THEN 50
  WHEN current_rank = 'Silver 3' THEN 60
  WHEN current_rank = 'Gold 1' THEN 70
  WHEN current_rank = 'Gold 2' THEN 80
  WHEN current_rank = 'Gold 3' THEN 90
  WHEN current_rank = 'Platinum 1' THEN 100
  WHEN current_rank = 'Platinum 2' THEN 115
  WHEN current_rank = 'Platinum 3' THEN 130
  WHEN current_rank = 'Diamond 1' THEN 150
  WHEN current_rank = 'Diamond 2' THEN 170
  WHEN current_rank = 'Diamond 3' THEN 190
  WHEN current_rank = 'Ascendant 1' THEN 215
  WHEN current_rank = 'Ascendant 2' THEN 240
  WHEN current_rank = 'Ascendant 3' THEN 265
  WHEN current_rank = 'Immortal 1' THEN 300
  WHEN current_rank = 'Immortal 2' THEN 350
  WHEN current_rank = 'Immortal 3' THEN 400
  WHEN current_rank = 'Radiant' THEN 500
  WHEN current_rank = 'Phantom' THEN 150
  ELSE 150 -- Default for Unranked or unknown ranks
END
WHERE current_rank IS NOT NULL;
