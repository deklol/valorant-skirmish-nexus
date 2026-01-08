-- Fix: Add WHERE clauses to satisfy Supabase's protection against mass updates
CREATE OR REPLACE FUNCTION recalculate_all_user_statistics()
RETURNS TABLE(users_updated INTEGER, total_wins INTEGER, total_losses INTEGER, total_tournament_wins INTEGER, total_tournaments_played INTEGER) AS $$
DECLARE
  updated_count INTEGER := 0;
  wins_count INTEGER := 0;
  losses_count INTEGER := 0;
  tourney_wins_count INTEGER := 0;
  tourney_played_count INTEGER := 0;
BEGIN
  -- Step 1: Reset all statistics to zero (WHERE id IS NOT NULL is always true)
  UPDATE users SET 
    wins = 0,
    losses = 0,
    tournaments_won = 0,
    tournaments_played = 0
  WHERE id IS NOT NULL;
  
  -- Step 2: Calculate and update wins
  UPDATE users u SET wins = COALESCE((
    SELECT COUNT(DISTINCT m.id)
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    JOIN tournaments tour ON t.tournament_id = tour.id
    JOIN matches m ON (m.winner_id = t.id AND m.tournament_id = tour.id)
    WHERE tm.user_id = u.id 
      AND tour.status = 'completed' 
      AND m.status = 'completed'
  ), 0)
  WHERE u.id IS NOT NULL;
  
  -- Step 3: Calculate and update losses
  UPDATE users u SET losses = COALESCE((
    SELECT COUNT(DISTINCT m.id)
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    JOIN tournaments tour ON t.tournament_id = tour.id
    JOIN matches m ON (
      (m.team1_id = t.id OR m.team2_id = t.id) 
      AND m.winner_id IS NOT NULL 
      AND m.winner_id != t.id
      AND m.tournament_id = tour.id
    )
    WHERE tm.user_id = u.id 
      AND tour.status = 'completed' 
      AND m.status = 'completed'
  ), 0)
  WHERE u.id IS NOT NULL;
  
  -- Step 4: Calculate and update tournament wins
  UPDATE users u SET tournaments_won = COALESCE((
    SELECT COUNT(DISTINCT t.tournament_id)
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    JOIN tournaments tour ON t.tournament_id = tour.id
    WHERE tm.user_id = u.id 
      AND tour.status = 'completed' 
      AND t.status = 'winner'
  ), 0)
  WHERE u.id IS NOT NULL;
  
  -- Step 5: Calculate and update tournaments played
  UPDATE users u SET tournaments_played = COALESCE((
    SELECT COUNT(DISTINCT t.tournament_id)
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    JOIN tournaments tour ON t.tournament_id = tour.id
    WHERE tm.user_id = u.id 
      AND tour.status = 'completed'
  ), 0)
  WHERE u.id IS NOT NULL;
  
  -- Get summary counts
  SELECT COUNT(*) INTO updated_count FROM users WHERE wins > 0 OR losses > 0 OR tournaments_played > 0;
  SELECT COALESCE(SUM(wins), 0) INTO wins_count FROM users;
  SELECT COALESCE(SUM(losses), 0) INTO losses_count FROM users;
  SELECT COALESCE(SUM(tournaments_won), 0) INTO tourney_wins_count FROM users;
  SELECT COALESCE(SUM(tournaments_played), 0) INTO tourney_played_count FROM users;
  
  RETURN QUERY SELECT updated_count, wins_count, losses_count, tourney_wins_count, tourney_played_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;