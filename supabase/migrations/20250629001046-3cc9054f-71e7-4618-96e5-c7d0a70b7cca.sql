
-- Fix the audit logging functions that have duplicate column names

-- Fixed generic audit logging function
CREATE OR REPLACE FUNCTION log_audit_event(
  p_table_name text,
  p_action text,
  p_record_id uuid,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
END;
$$;

-- Fixed error logging function
CREATE OR REPLACE FUNCTION log_application_error(
  p_component text,
  p_error_message text,
  p_error_code text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    action,
    record_id,
    user_id,
    created_at,
    new_values
  ) VALUES (
    'application_errors',
    'ERROR',
    gen_random_uuid(),
    COALESCE(p_user_id, auth.uid()),
    now(),
    jsonb_build_object(
      'component', p_component,
      'error_message', p_error_message,
      'error_code', p_error_code,
      'metadata', p_metadata,
      'user_info', get_user_info_for_audit()
    )
  );
END;
$$;
