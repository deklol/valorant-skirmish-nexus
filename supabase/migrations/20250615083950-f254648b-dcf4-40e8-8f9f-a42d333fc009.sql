
-- 1. Add a new column to store the map display name for veto actions
ALTER TABLE audit_logs
  ADD COLUMN map_display_name text;

-- 2. Update the map_veto_actions logging trigger to include the display name in the audit
-- (Assuming your audit log trigger is named 'log_map_veto_action' and fires on INSERT on map_veto_actions)

DROP TRIGGER IF EXISTS log_map_veto_action ON map_veto_actions;

-- First, create or replace the function for logging veto actions:
CREATE OR REPLACE FUNCTION public.log_map_veto_action()
RETURNS TRIGGER AS $$
DECLARE
  map_display text;
BEGIN
  SELECT display_name INTO map_display FROM maps WHERE id = NEW.map_id;
  INSERT INTO audit_logs (
    table_name,
    action,
    record_id,
    user_id,
    new_values,
    created_at,
    map_display_name
  ) VALUES (
    'map_veto_actions',
    'INSERT',
    NEW.id,
    NEW.performed_by,
    to_jsonb(NEW),
    now(),
    map_display
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then, re-create the trigger to use this function:
CREATE TRIGGER log_map_veto_action
  AFTER INSERT ON map_veto_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_map_veto_action();
