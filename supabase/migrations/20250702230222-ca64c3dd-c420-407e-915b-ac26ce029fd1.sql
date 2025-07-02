-- Re-enable the audit trigger now that log_audit_event function is fixed
ALTER TABLE public.users ENABLE TRIGGER audit_users_trigger;