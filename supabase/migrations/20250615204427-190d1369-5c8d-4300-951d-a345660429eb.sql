
-- Fix audit log trigger for veto actions: run as SECURITY DEFINER to bypass RLS

-- 1. Change owner of log_map_veto_action to an admin (usually postgres or supabase_admin) so SECURITY DEFINER is effective
-- (Ownership change should be performed through your DB console if needed)

-- 2. Drop the existing trigger to allow creation of the new function.
DROP TRIGGER IF EXISTS log_map_veto_action ON map_veto_actions;

-- 3. Replace the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.log_map_veto_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 4. Re-create the trigger on map_veto_actions to use the fixed function
CREATE TRIGGER log_map_veto_action
  AFTER INSERT ON map_veto_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_map_veto_action();
