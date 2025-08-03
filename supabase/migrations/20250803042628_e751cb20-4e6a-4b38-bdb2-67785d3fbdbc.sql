-- Clean up the bracket structure for tournament 2c74f9d5-5a49-4451-a2c2-58a75c09e3bc
-- Remove the duplicate/incorrect matches that were created during re-generation

-- Delete the duplicate round 1 matches that shouldn't exist
DELETE FROM matches 
WHERE tournament_id = '2c74f9d5-5a49-4451-a2c2-58a75c09e3bc' 
AND id IN (
  'a82b5c73-d9fd-43be-83b5-92bd78f4c641', -- Duplicate Team arulerm vs Team jake22_
  '4309b9ef-05b3-4c72-ac6f-f56f0c8ee7af'  -- Duplicate Team keratasf vs Team adum__
);

-- Delete the orphaned round 2 match with no teams
DELETE FROM matches 
WHERE tournament_id = '2c74f9d5-5a49-4451-a2c2-58a75c09e3bc' 
AND id = '0404e079-081d-4e0e-aa8e-08e4695c8f12'
AND team1_id IS NULL 
AND team2_id IS NULL;