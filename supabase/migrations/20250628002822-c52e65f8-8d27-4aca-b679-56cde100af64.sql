
-- Create a comprehensive tournament deletion function with statistics reversal (fixed)
CREATE OR REPLACE FUNCTION public.safe_delete_tournament(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tournament_rec RECORD;
  team_rec RECORD;
  member_rec RECORD;
  match_rec RECORD;
  winner_team_id UUID;
  deleted_counts JSONB := '{}'::jsonb;
  total_participants INTEGER := 0;
  total_winners INTEGER := 0;
  row_count_var INTEGER;
BEGIN
  -- Step 1: Validate tournament exists and get details
  SELECT * INTO tournament_rec FROM tournaments WHERE id = p_tournament_id;
  IF tournament_rec IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Step 2: Safety check - only allow deletion of completed or archived tournaments
  IF tournament_rec.status NOT IN ('completed', 'archived', 'draft') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Can only delete completed, archived, or draft tournaments. Current status: ' || tournament_rec.status
    );
  END IF;

  -- Step 3: Get winner team for statistics reversal
  SELECT id INTO winner_team_id 
  FROM teams 
  WHERE tournament_id = p_tournament_id AND status = 'winner'
  LIMIT 1;

  -- Step 4: Reverse player statistics BEFORE deleting data
  -- Count participants for tournaments_played reversal
  SELECT COUNT(DISTINCT ts.user_id) INTO total_participants
  FROM tournament_signups ts
  WHERE ts.tournament_id = p_tournament_id;

  -- Count winners for tournament_wins reversal
  IF winner_team_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT tm.user_id) INTO total_winners
    FROM team_members tm
    WHERE tm.team_id = winner_team_id;
  END IF;

  -- Reverse match win/loss statistics for each completed match
  FOR match_rec IN 
    SELECT m.*, 
           tw.user_id as winner_user, 
           tl.user_id as loser_user
    FROM matches m
    LEFT JOIN team_members tw ON tw.team_id = m.winner_id
    LEFT JOIN team_members tl ON (
      CASE 
        WHEN m.winner_id = m.team1_id THEN tl.team_id = m.team2_id
        ELSE tl.team_id = m.team1_id
      END
    )
    WHERE m.tournament_id = p_tournament_id 
    AND m.status = 'completed'
    AND m.winner_id IS NOT NULL
  LOOP
    -- Decrement wins for winning team members
    IF match_rec.winner_user IS NOT NULL THEN
      UPDATE users 
      SET wins = GREATEST(COALESCE(wins, 0) - 1, 0)
      WHERE id = match_rec.winner_user;
    END IF;
    
    -- Decrement losses for losing team members  
    IF match_rec.loser_user IS NOT NULL THEN
      UPDATE users 
      SET losses = GREATEST(COALESCE(losses, 0) - 1, 0)
      WHERE id = match_rec.loser_user;
    END IF;
  END LOOP;

  -- Reverse tournament_wins for winning team members
  IF winner_team_id IS NOT NULL THEN
    UPDATE users 
    SET tournaments_won = GREATEST(COALESCE(tournaments_won, 0) - 1, 0)
    WHERE id IN (
      SELECT tm.user_id 
      FROM team_members tm 
      WHERE tm.team_id = winner_team_id
    );
  END IF;

  -- Reverse tournaments_played for all participants
  UPDATE users 
  SET tournaments_played = GREATEST(COALESCE(tournaments_played, 0) - 1, 0)
  WHERE id IN (
    SELECT DISTINCT ts.user_id 
    FROM tournament_signups ts 
    WHERE ts.tournament_id = p_tournament_id
  );

  -- Step 5: Delete tournament data in proper order (respecting foreign keys)
  
  -- Delete audit logs related to veto sessions
  DELETE FROM audit_logs 
  WHERE record_id IN (
    SELECT mvs.id FROM map_veto_sessions mvs 
    WHERE mvs.match_id IN (
      SELECT m.id FROM matches m WHERE m.tournament_id = p_tournament_id
    )
  );
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{audit_logs}', to_jsonb(row_count_var));

  -- Delete map veto actions
  DELETE FROM map_veto_actions 
  WHERE veto_session_id IN (
    SELECT mvs.id FROM map_veto_sessions mvs 
    WHERE mvs.match_id IN (
      SELECT m.id FROM matches m WHERE m.tournament_id = p_tournament_id
    )
  );
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{map_veto_actions}', to_jsonb(row_count_var));

  -- Delete map veto sessions
  DELETE FROM map_veto_sessions 
  WHERE match_id IN (
    SELECT m.id FROM matches m WHERE m.tournament_id = p_tournament_id
  );
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{map_veto_sessions}', to_jsonb(row_count_var));

  -- Delete match result submissions
  DELETE FROM match_result_submissions 
  WHERE match_id IN (
    SELECT m.id FROM matches m WHERE m.tournament_id = p_tournament_id
  );
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{match_result_submissions}', to_jsonb(row_count_var));

  -- Delete match maps
  DELETE FROM match_maps 
  WHERE match_id IN (
    SELECT m.id FROM matches m WHERE m.tournament_id = p_tournament_id
  );
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{match_maps}', to_jsonb(row_count_var));

  -- Delete matches
  DELETE FROM matches WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{matches}', to_jsonb(row_count_var));

  -- Delete team members
  DELETE FROM team_members 
  WHERE team_id IN (
    SELECT t.id FROM teams t WHERE t.tournament_id = p_tournament_id
  );
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{team_members}', to_jsonb(row_count_var));

  -- Delete teams
  DELETE FROM teams WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{teams}', to_jsonb(row_count_var));

  -- Delete tournament signups
  DELETE FROM tournament_signups WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{tournament_signups}', to_jsonb(row_count_var));

  -- Delete phantom players for this tournament
  DELETE FROM phantom_players WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{phantom_players}', to_jsonb(row_count_var));

  -- Delete tournament notifications
  DELETE FROM notifications WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{notifications}', to_jsonb(row_count_var));

  -- Delete announcements for this tournament
  DELETE FROM announcements WHERE tournament_id = p_tournament_id;
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{announcements}', to_jsonb(row_count_var));

  -- Finally, delete the tournament itself
  DELETE FROM tournaments WHERE id = p_tournament_id;
  GET DIAGNOSTICS row_count_var = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{tournaments}', to_jsonb(row_count_var));

  -- Step 6: Log the deletion operation
  INSERT INTO audit_logs (
    table_name,
    action,
    record_id,
    user_id,
    new_values,
    created_at
  ) VALUES (
    'tournaments',
    'SAFE_DELETE',
    p_tournament_id,
    auth.uid(),
    jsonb_build_object(
      'tournament_name', tournament_rec.name,
      'deleted_counts', deleted_counts,
      'participants_affected', total_participants,
      'winners_affected', total_winners,
      'deletion_timestamp', now()
    ),
    now()
  );

  -- Return success with detailed information
  RETURN jsonb_build_object(
    'success', true,
    'tournament_name', tournament_rec.name,
    'deleted_counts', deleted_counts,
    'statistics_reversed', jsonb_build_object(
      'participants_tournaments_played_decremented', total_participants,
      'winners_tournament_wins_decremented', total_winners
    )
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error information
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- Grant execute permission to authenticated users (admins will be checked in app logic)
GRANT EXECUTE ON FUNCTION public.safe_delete_tournament(UUID) TO authenticated;
