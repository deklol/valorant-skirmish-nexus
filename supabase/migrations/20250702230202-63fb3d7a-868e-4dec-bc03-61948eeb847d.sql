-- Temporarily disable the audit trigger to test if it's causing the issue
ALTER TABLE public.users DISABLE TRIGGER audit_users_trigger;