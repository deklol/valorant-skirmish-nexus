-- Fix the check_and_award_achievements function first
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
 RETURNS TABLE(newly_earned_achievement_id uuid, achievement_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  user_stats RECORD;
  achievement_rec RECORD;
  win_rate DECIMAL;
  total_matches INTEGER;
BEGIN
  -- Get user statistics
  SELECT wins, losses, tournaments_played, tournaments_won, mvp_awards
  INTO user_stats
  FROM users WHERE id = p_user_id;
  
  IF user_stats IS NULL THEN
    RETURN;
  END IF;

  total_matches := COALESCE(user_stats.wins, 0) + COALESCE(user_stats.losses, 0);
  
  -- Calculate win rate if user has matches
  IF total_matches > 0 THEN
    win_rate := (COALESCE(user_stats.wins, 0)::DECIMAL / total_matches) * 100;
  ELSE
    win_rate := 0;
  END IF;

  -- Check each achievement
  FOR achievement_rec IN SELECT * FROM achievements WHERE is_active = true LOOP
    -- Skip if user already has this achievement
    IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = achievement_rec.id) THEN
      CONTINUE;
    END IF;

    -- Check achievement requirements
    CASE achievement_rec.requirement_type
      WHEN 'tournament_wins' THEN
        IF COALESCE(user_stats.tournaments_won, 0) >= achievement_rec.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
        
      WHEN 'total_wins' THEN
        IF COALESCE(user_stats.wins, 0) >= achievement_rec.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
        
      WHEN 'tournaments_played' THEN
        IF COALESCE(user_stats.tournaments_played, 0) >= achievement_rec.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
        
      WHEN 'win_rate_75' THEN
        IF total_matches >= achievement_rec.requirement_value AND win_rate >= 75 THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
        
      WHEN 'win_rate_90' THEN
        IF total_matches >= achievement_rec.requirement_value AND win_rate >= 90 THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_rec.id);
          newly_earned_achievement_id := achievement_rec.id;
          achievement_name := achievement_rec.name;
          RETURN NEXT;
        END IF;
      ELSE
        -- Handle any unknown requirement types gracefully
        NULL;
    END CASE;
  END LOOP;
END;
$$;