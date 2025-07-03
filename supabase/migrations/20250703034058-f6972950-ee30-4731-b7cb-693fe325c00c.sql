-- Fix the current stuck veto session by correcting the turn sequence
-- Session 762d5585-a07c-4107-9dd4-872209b3f890 is stuck on position 4
-- According to BO1 sequence [home, away, away, home, away, home], position 4 should be home team

UPDATE map_veto_sessions 
SET current_turn_team_id = '72405635-b689-43f6-9ea5-93b5bbe8d5a2' -- Set to home team for position 4
WHERE id = '762d5585-a07c-4107-9dd4-872209b3f890'
AND current_turn_team_id = '50855923-3e25-4d63-b63c-2f06c2bcf076'; -- Only if still stuck on away team