
-- Drop existing functions to recreate them with proper permissions
DROP FUNCTION IF EXISTS public.increment_user_wins(uuid);
DROP FUNCTION IF EXISTS public.increment_user_losses(uuid);
DROP FUNCTION IF EXISTS public.increment_user_tournament_wins(uuid);
DROP FUNCTION IF EXISTS public.increment_user_tournaments_played(uuid);

-- Recreate functions with SECURITY DEFINER to allow proper permissions
CREATE OR REPLACE FUNCTION public.increment_user_wins(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET wins = COALESCE(wins, 0) + 1
  WHERE id = user_id;
  
  -- Log the update for debugging
  RAISE LOG 'Incremented wins for user %', user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_user_losses(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET losses = COALESCE(losses, 0) + 1
  WHERE id = user_id;
  
  -- Log the update for debugging
  RAISE LOG 'Incremented losses for user %', user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_user_tournament_wins(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET tournaments_won = COALESCE(tournaments_won, 0) + 1
  WHERE id = user_id;
  
  -- Log the update for debugging
  RAISE LOG 'Incremented tournament wins for user %', user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_user_tournaments_played(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET tournaments_played = COALESCE(tournaments_played, 0) + 1
  WHERE id = user_id;
  
  -- Log the update for debugging
  RAISE LOG 'Incremented tournaments played for user %', user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the functions work by incrementing stats for user "_dek" who should have 1 win
SELECT increment_user_wins('6aba8f3f-bd6e-4e01-8786-62aa39a62c2f'::uuid);
SELECT increment_user_tournaments_played('6aba8f3f-bd6e-4e01-8786-62aa39a62c2f'::uuid);

-- Verify the update worked
SELECT discord_username, wins, losses, tournaments_played, tournaments_won 
FROM users 
WHERE id = '6aba8f3f-bd6e-4e01-8786-62aa39a62c2f';
