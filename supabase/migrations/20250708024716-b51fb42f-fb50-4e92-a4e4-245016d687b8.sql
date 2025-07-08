-- Fix foreign key relationships for map_veto_sessions to teams
-- Add proper foreign key constraints that were missing

ALTER TABLE map_veto_sessions 
ADD CONSTRAINT map_veto_sessions_home_team_id_fkey 
FOREIGN KEY (home_team_id) REFERENCES teams(id);

ALTER TABLE map_veto_sessions 
ADD CONSTRAINT map_veto_sessions_away_team_id_fkey 
FOREIGN KEY (away_team_id) REFERENCES teams(id);