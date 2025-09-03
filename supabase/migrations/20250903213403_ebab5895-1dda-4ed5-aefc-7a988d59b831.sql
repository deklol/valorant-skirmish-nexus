-- Create team_session_modifications table for audit trail
CREATE TABLE public.team_session_modifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL,
  team_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  modification_type TEXT NOT NULL, -- 'player_added', 'player_removed'
  affected_user_id UUID NOT NULL,
  reason TEXT,
  original_team_weight INTEGER,
  new_team_weight INTEGER,
  stats_reversed JSONB DEFAULT '{}',
  stats_applied JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on team_session_modifications
ALTER TABLE public.team_session_modifications ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage team session modifications
CREATE POLICY "Admins can manage team session modifications"
ON public.team_session_modifications
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Function to reverse player tournament stats
CREATE OR REPLACE FUNCTION public.reverse_player_tournament_stats(
  p_user_id UUID,
  p_tournament_id UUID,
  p_team_id UUID
) RETURNS JSONB AS $$
DECLARE
  match_wins INTEGER := 0;
  match_losses INTEGER := 0;
  tournament_win_count INTEGER := 0;
  stats_reversed JSONB;
  match_record RECORD;
BEGIN
  -- Count wins and losses for this player in this tournament
  FOR match_record IN
    SELECT m.id, m.winner_id, m.team1_id, m.team2_id
    FROM matches m
    JOIN team_members tm ON (tm.team_id = m.team1_id OR tm.team_id = m.team2_id)
    WHERE m.tournament_id = p_tournament_id 
    AND tm.user_id = p_user_id 
    AND tm.team_id = p_team_id
    AND m.status = 'completed'
    AND m.winner_id IS NOT NULL
  LOOP
    IF match_record.winner_id = p_team_id THEN
      match_wins := match_wins + 1;
    ELSE
      match_losses := match_losses + 1;
    END IF;
  END LOOP;

  -- Check if player was on winning team
  SELECT COUNT(*) INTO tournament_win_count
  FROM teams t
  WHERE t.id = p_team_id 
  AND t.tournament_id = p_tournament_id 
  AND t.status = 'winner';

  -- Reverse the stats
  UPDATE users 
  SET 
    wins = GREATEST(COALESCE(wins, 0) - match_wins, 0),
    losses = GREATEST(COALESCE(losses, 0) - match_losses, 0),
    tournaments_played = GREATEST(COALESCE(tournaments_played, 0) - 1, 0),
    tournaments_won = GREATEST(COALESCE(tournaments_won, 0) - tournament_win_count, 0)
  WHERE id = p_user_id;

  -- Build stats object for audit
  stats_reversed := jsonb_build_object(
    'wins_reversed', match_wins,
    'losses_reversed', match_losses,
    'tournaments_played_reversed', 1,
    'tournaments_won_reversed', tournament_win_count
  );

  RETURN stats_reversed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate team weights
CREATE OR REPLACE FUNCTION public.recalculate_team_weight(p_team_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_weight INTEGER := 0;
  member_record RECORD;
BEGIN
  -- Calculate new total weight from all current team members
  FOR member_record IN
    SELECT u.rank_points, u.weight_rating, u.manual_weight_override, u.use_manual_override
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = p_team_id
  LOOP
    -- Use manual override if enabled, otherwise use rank_points or weight_rating
    IF member_record.use_manual_override AND member_record.manual_weight_override IS NOT NULL THEN
      new_weight := new_weight + member_record.manual_weight_override;
    ELSIF member_record.rank_points IS NOT NULL THEN
      new_weight := new_weight + member_record.rank_points;
    ELSIF member_record.weight_rating IS NOT NULL THEN
      new_weight := new_weight + member_record.weight_rating;
    ELSE
      new_weight := new_weight + 150; -- Default weight
    END IF;
  END LOOP;

  -- Update team total_rank_points
  UPDATE teams 
  SET total_rank_points = new_weight,
      updated_at = now()
  WHERE id = p_team_id;

  RETURN new_weight;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely remove player from team
CREATE OR REPLACE FUNCTION public.remove_player_from_team(
  p_team_id UUID,
  p_user_id UUID,
  p_tournament_id UUID,
  p_reason TEXT DEFAULT 'Admin removal'
) RETURNS JSONB AS $$
DECLARE
  original_weight INTEGER;
  new_weight INTEGER;
  stats_reversed JSONB;
  result JSONB;
BEGIN
  -- Get original team weight
  SELECT total_rank_points INTO original_weight 
  FROM teams WHERE id = p_team_id;

  -- Reverse player stats for this tournament
  SELECT reverse_player_tournament_stats(p_user_id, p_tournament_id, p_team_id) 
  INTO stats_reversed;

  -- Remove player from team
  DELETE FROM team_members 
  WHERE team_id = p_team_id AND user_id = p_user_id;

  -- Recalculate team weight
  SELECT recalculate_team_weight(p_team_id) INTO new_weight;

  -- Log the modification
  INSERT INTO team_session_modifications (
    tournament_id, team_id, admin_user_id, modification_type,
    affected_user_id, reason, original_team_weight, new_team_weight,
    stats_reversed
  ) VALUES (
    p_tournament_id, p_team_id, auth.uid(), 'player_removed',
    p_user_id, p_reason, original_weight, new_weight, stats_reversed
  );

  -- Create audit log entry
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'team_members', 'MEDIC_REMOVE_PLAYER', p_team_id, auth.uid(),
    jsonb_build_object(
      'removed_user_id', p_user_id,
      'tournament_id', p_tournament_id,
      'reason', p_reason,
      'weight_change', original_weight - new_weight,
      'stats_reversed', stats_reversed
    ), now()
  );

  result := jsonb_build_object(
    'success', true,
    'original_weight', original_weight,
    'new_weight', new_weight,
    'stats_reversed', stats_reversed
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely add player to team
CREATE OR REPLACE FUNCTION public.add_player_to_team(
  p_team_id UUID,
  p_user_id UUID,
  p_tournament_id UUID,
  p_is_captain BOOLEAN DEFAULT false,
  p_reason TEXT DEFAULT 'Admin addition'
) RETURNS JSONB AS $$
DECLARE
  original_weight INTEGER;
  new_weight INTEGER;
  user_weight INTEGER := 150;
  result JSONB;
  user_record RECORD;
BEGIN
  -- Check if user is already on a team in this tournament
  IF EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.user_id = p_user_id AND t.tournament_id = p_tournament_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already on a team in this tournament');
  END IF;

  -- Get user weight details
  SELECT rank_points, weight_rating, manual_weight_override, use_manual_override
  INTO user_record
  FROM users WHERE id = p_user_id;

  -- Calculate user weight
  IF user_record.use_manual_override AND user_record.manual_weight_override IS NOT NULL THEN
    user_weight := user_record.manual_weight_override;
  ELSIF user_record.rank_points IS NOT NULL THEN
    user_weight := user_record.rank_points;
  ELSIF user_record.weight_rating IS NOT NULL THEN
    user_weight := user_record.weight_rating;
  END IF;

  -- Get original team weight
  SELECT total_rank_points INTO original_weight 
  FROM teams WHERE id = p_team_id;

  -- Add player to team
  INSERT INTO team_members (team_id, user_id, is_captain)
  VALUES (p_team_id, p_user_id, p_is_captain);

  -- Increment tournaments_played for the user
  UPDATE users 
  SET tournaments_played = COALESCE(tournaments_played, 0) + 1
  WHERE id = p_user_id;

  -- Recalculate team weight
  SELECT recalculate_team_weight(p_team_id) INTO new_weight;

  -- Log the modification
  INSERT INTO team_session_modifications (
    tournament_id, team_id, admin_user_id, modification_type,
    affected_user_id, reason, original_team_weight, new_team_weight,
    stats_applied
  ) VALUES (
    p_tournament_id, p_team_id, auth.uid(), 'player_added',
    p_user_id, p_reason, original_weight, new_weight,
    jsonb_build_object('tournaments_played_added', 1, 'user_weight', user_weight)
  );

  -- Create audit log entry
  INSERT INTO audit_logs (
    table_name, action, record_id, user_id, new_values, created_at
  ) VALUES (
    'team_members', 'MEDIC_ADD_PLAYER', p_team_id, auth.uid(),
    jsonb_build_object(
      'added_user_id', p_user_id,
      'tournament_id', p_tournament_id,
      'reason', p_reason,
      'weight_change', new_weight - original_weight,
      'user_weight', user_weight,
      'is_captain', p_is_captain
    ), now()
  );

  result := jsonb_build_object(
    'success', true,
    'original_weight', original_weight,
    'new_weight', new_weight,
    'weight_added', user_weight
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;