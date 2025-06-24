
-- Add database indices for better performance
CREATE INDEX IF NOT EXISTS idx_matches_tournament_round ON matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_signups_tournament ON tournament_signups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_map_veto_sessions_match ON map_veto_sessions(match_id);
CREATE INDEX IF NOT EXISTS idx_map_veto_actions_session ON map_veto_actions(veto_session_id);
