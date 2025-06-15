
-- 1. Manually fix: Set current_turn_team_id to Team _dek so turns can advance for this session.
UPDATE map_veto_sessions
SET current_turn_team_id = 'ed70e520-eff8-4233-90bd-62d56a4eb925'
WHERE id = 'f51f1a93-0062-41e5-bcb0-90e4e01a4cad';

-- 2. Add richer audit log trigger for veto session turn changes for debugging
DROP TRIGGER IF EXISTS log_veto_turn_switch ON map_veto_sessions;

CREATE OR REPLACE FUNCTION public.log_veto_turn_switch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if turn is actively changed
  IF NEW.current_turn_team_id IS DISTINCT FROM OLD.current_turn_team_id THEN
    INSERT INTO audit_logs (
      table_name,
      action,
      record_id,
      user_id,
      new_values,
      old_values,
      created_at
    ) VALUES (
      'map_veto_sessions',
      'TURN_SWITCH',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      to_jsonb(OLD),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_veto_turn_switch
  AFTER UPDATE ON map_veto_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_veto_turn_switch();

-- 3. (Optional, cleaner) Remove old stray debug triggers if any:
-- No further action required.

-- 4. (Optional, for visibility) Next, you should review audit_logs for the latest turn switches.
