-- Fix the user_has_notification_enabled function by adding ELSE clause to CASE statement
CREATE OR REPLACE FUNCTION public.user_has_notification_enabled(p_user_id uuid, p_notification_type text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  is_enabled BOOLEAN := TRUE;
BEGIN
  -- Get user preference for this notification type
  CASE p_notification_type
    WHEN 'new_tournament_posted' THEN
      SELECT new_tournament_posted INTO is_enabled FROM user_notification_preferences WHERE user_id = p_user_id;
    WHEN 'tournament_signups_open' THEN
      SELECT tournament_signups_open INTO is_enabled FROM user_notification_preferences WHERE user_id = p_user_id;
    WHEN 'tournament_checkin_time' THEN
      SELECT tournament_checkin_time INTO is_enabled FROM user_notification_preferences WHERE user_id = p_user_id;
    WHEN 'team_assigned' THEN
      SELECT team_assigned INTO is_enabled FROM user_notification_preferences WHERE user_id = p_user_id;
    WHEN 'match_assigned' THEN
      SELECT match_assigned INTO is_enabled FROM user_notification_preferences WHERE user_id = p_user_id;
    WHEN 'match_ready' THEN
      SELECT match_ready INTO is_enabled FROM user_notification_preferences WHERE user_id = p_user_id;
    WHEN 'post_results' THEN
      SELECT post_results INTO is_enabled FROM user_notification_preferences WHERE user_id = p_user_id;
    ELSE
      -- Default to true for unknown notification types
      is_enabled := TRUE;
  END CASE;
  
  -- Default to true if no preference found
  RETURN COALESCE(is_enabled, TRUE);
END;
$$;