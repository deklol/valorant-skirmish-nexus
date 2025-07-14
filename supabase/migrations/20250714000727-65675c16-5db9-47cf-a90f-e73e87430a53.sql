-- Fix all remaining audit functions to prevent "case not found" errors by adding ELSE clauses

-- Fix audit_users function
CREATE OR REPLACE FUNCTION public.audit_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  description text;
BEGIN
  CASE TG_OP
    WHEN 'INSERT' THEN
      description := 'User "' || COALESCE(NEW.discord_username, 'Unknown') || '" created';
      PERFORM log_audit_event('users', 'CREATE', NEW.id, NULL, to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'UPDATE' THEN
      description := 'User "' || COALESCE(NEW.discord_username, 'Unknown') || '" updated';
      PERFORM log_audit_event('users', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'DELETE' THEN
      description := 'User "' || COALESCE(OLD.discord_username, 'Unknown') || '" deleted';
      PERFORM log_audit_event('users', 'DELETE', OLD.id, to_jsonb(OLD), NULL, description);
      RETURN OLD;
    ELSE
      -- Handle any unexpected operation types to prevent "case not found" errors
      RAISE LOG 'Unexpected trigger operation: %', TG_OP;
      RETURN COALESCE(NEW, OLD);
  END CASE;
END;
$$;

-- Fix audit_teams function
CREATE OR REPLACE FUNCTION public.audit_teams()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  description text;
BEGIN
  CASE TG_OP
    WHEN 'INSERT' THEN
      description := 'Team "' || NEW.name || '" created';
      PERFORM log_audit_event('teams', 'CREATE', NEW.id, NULL, to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'UPDATE' THEN
      description := 'Team "' || NEW.name || '" updated';
      PERFORM log_audit_event('teams', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'DELETE' THEN
      description := 'Team "' || OLD.name || '" deleted';
      PERFORM log_audit_event('teams', 'DELETE', OLD.id, to_jsonb(OLD), NULL, description);
      RETURN OLD;
    ELSE
      -- Handle any unexpected operation types to prevent "case not found" errors
      RAISE LOG 'Unexpected trigger operation: %', TG_OP;
      RETURN COALESCE(NEW, OLD);
  END CASE;
END;
$$;

-- Fix audit_tournaments function
CREATE OR REPLACE FUNCTION public.audit_tournaments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  description text;
BEGIN
  CASE TG_OP
    WHEN 'INSERT' THEN
      description := 'Tournament "' || NEW.name || '" created';
      PERFORM log_audit_event('tournaments', 'CREATE', NEW.id, NULL, to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'UPDATE' THEN
      description := 'Tournament "' || NEW.name || '" updated';
      PERFORM log_audit_event('tournaments', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'DELETE' THEN
      description := 'Tournament "' || OLD.name || '" deleted';
      PERFORM log_audit_event('tournaments', 'DELETE', OLD.id, to_jsonb(OLD), NULL, description);
      RETURN OLD;
    ELSE
      -- Handle any unexpected operation types to prevent "case not found" errors
      RAISE LOG 'Unexpected trigger operation: %', TG_OP;
      RETURN COALESCE(NEW, OLD);
  END CASE;
END;
$$;

-- Fix audit_tournament_signups function
CREATE OR REPLACE FUNCTION public.audit_tournament_signups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  description text;
  tournament_name text;
  user_name text;
BEGIN
  -- Get context info
  SELECT name INTO tournament_name FROM tournaments WHERE id = COALESCE(NEW.tournament_id, OLD.tournament_id);
  SELECT discord_username INTO user_name FROM users WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  CASE TG_OP
    WHEN 'INSERT' THEN
      description := 'User "' || COALESCE(user_name, 'Unknown') || '" signed up for tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      PERFORM log_audit_event('tournament_signups', 'SIGNUP', NEW.id, NULL, to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'UPDATE' THEN
      IF OLD.is_checked_in = false AND NEW.is_checked_in = true THEN
        description := 'User "' || COALESCE(user_name, 'Unknown') || '" checked in for tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
        PERFORM log_audit_event('tournament_signups', 'CHECKIN', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      ELSE
        description := 'Signup updated for user "' || COALESCE(user_name, 'Unknown') || '" in tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
        PERFORM log_audit_event('tournament_signups', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      END IF;
      RETURN NEW;
    WHEN 'DELETE' THEN
      description := 'User "' || COALESCE(user_name, 'Unknown') || '" removed from tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      PERFORM log_audit_event('tournament_signups', 'WITHDRAW', OLD.id, to_jsonb(OLD), NULL, description);
      RETURN OLD;
    ELSE
      -- Handle any unexpected operation types to prevent "case not found" errors
      RAISE LOG 'Unexpected trigger operation: %', TG_OP;
      RETURN COALESCE(NEW, OLD);
  END CASE;
END;
$$;