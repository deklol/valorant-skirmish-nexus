-- Clean up the duplicate log_audit_event functions that are causing conflicts
DROP FUNCTION IF EXISTS public.log_audit_event(text, text, uuid, jsonb, jsonb, text);

-- Keep only the correct version that matches what the triggers expect
-- (This one should already exist from the earlier migrations)