-- Add helper function for achievement statistics
CREATE OR REPLACE FUNCTION public.get_achievement_leaders()
RETURNS TABLE(
  top_points_user_id uuid,
  top_points_username text,
  top_points_total integer,
  most_achievements_user_id uuid,
  most_achievements_username text,
  most_achievements_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  top_points_record RECORD;
  most_achievements_record RECORD;
BEGIN
  -- Get user with most achievement points
  SELECT ua.user_id, u.discord_username, SUM(a.points) as total_points
  INTO top_points_record
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  JOIN users u ON ua.user_id = u.id
  GROUP BY ua.user_id, u.discord_username
  ORDER BY total_points DESC
  LIMIT 1;

  -- Get user with most achievements
  SELECT ua.user_id, u.discord_username, COUNT(*) as achievement_count
  INTO most_achievements_record
  FROM user_achievements ua
  JOIN users u ON ua.user_id = u.id
  GROUP BY ua.user_id, u.discord_username
  ORDER BY achievement_count DESC
  LIMIT 1;

  -- Return the results
  top_points_user_id := top_points_record.user_id;
  top_points_username := top_points_record.discord_username;
  top_points_total := top_points_record.total_points;
  most_achievements_user_id := most_achievements_record.user_id;
  most_achievements_username := most_achievements_record.discord_username;
  most_achievements_count := most_achievements_record.achievement_count;

  RETURN NEXT;
END;
$function$;