-- Drop the incorrect function and recreate with the proper signature that matches the triggers
DROP FUNCTION IF EXISTS public.log_audit_event(text, text, uuid, jsonb, jsonb, text);

-- Create the function with the exact signature the triggers expect
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_table_name text,
  p_action text, 
  p_record_id uuid,
  p_old_values jsonb,
  p_new_values jsonb,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    action,
    record_id,
    user_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    p_table_name,
    p_action,
    p_record_id,
    auth.uid(),
    p_old_values,
    jsonb_build_object(
      'data', p_new_values,
      'description', p_description,
      'user_info', get_user_info_for_audit()
    ),
    now()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If audit logging fails, don't block the main operation
    RAISE WARNING 'Audit logging failed: %', SQLERRM;
END;
$function$;