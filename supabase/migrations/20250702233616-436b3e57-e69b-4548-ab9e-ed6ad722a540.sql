-- Drop all existing versions of log_audit_event function
DROP FUNCTION IF EXISTS public.log_audit_event(text, text, uuid, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS public.log_audit_event(text, text, uuid, jsonb, jsonb, text, jsonb);

-- Create the correct function signature that matches the expected interface
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_table_name text,
  p_action text, 
  p_record_id uuid,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
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
      'user_info', get_user_info_for_audit(),
      'metadata', p_metadata
    ),
    now()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If audit logging fails, don't block the main operation
    RAISE WARNING 'Audit logging failed: %', SQLERRM;
END;
$function$;