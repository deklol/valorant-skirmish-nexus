-- Temporarily disable the audit trigger on users table to test user creation
ALTER TABLE public.users DISABLE TRIGGER audit_users_trigger;