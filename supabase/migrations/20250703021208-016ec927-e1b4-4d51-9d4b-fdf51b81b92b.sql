-- Fix the current broken veto session by updating the turn to the away team
UPDATE map_veto_sessions 
SET current_turn_team_id = '72405635-b689-43f6-9ea5-93b5bbe8d5a2' -- away team should be next
WHERE id = '762d5585-a07c-4107-9dd4-872209b3f890'
AND current_turn_team_id = '50855923-3e25-4d63-b63c-2f06c2bcf076'; -- only update if it's still stuck on home team