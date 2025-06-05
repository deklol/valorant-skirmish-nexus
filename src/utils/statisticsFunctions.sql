
-- Function to increment user wins
CREATE OR REPLACE FUNCTION increment_user_wins(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET wins = COALESCE(wins, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment user losses  
CREATE OR REPLACE FUNCTION increment_user_losses(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET losses = COALESCE(losses, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment tournament wins
CREATE OR REPLACE FUNCTION increment_user_tournament_wins(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET tournaments_won = COALESCE(tournaments_won, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment tournaments played
CREATE OR REPLACE FUNCTION increment_user_tournaments_played(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET tournaments_played = COALESCE(tournaments_played, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
