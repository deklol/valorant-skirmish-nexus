-- Fix the audit_matches function by adding an ELSE clause to prevent "case not found" errors
CREATE OR REPLACE FUNCTION public.audit_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  description text;
  tournament_name text;
BEGIN
  -- Get tournament name for context
  SELECT name INTO tournament_name FROM tournaments WHERE id = COALESCE(NEW.tournament_id, OLD.tournament_id);
  
  CASE TG_OP
    WHEN 'INSERT' THEN
      description := 'Match created for tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      PERFORM log_audit_event('matches', 'CREATE', NEW.id, NULL, to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'UPDATE' THEN
      IF OLD.status != NEW.status THEN
        description := 'Match status changed from "' || OLD.status || '" to "' || NEW.status || '" in tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      ELSIF OLD.winner_id IS NULL AND NEW.winner_id IS NOT NULL THEN
        description := 'Match result submitted in tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      ELSE
        description := 'Match updated in tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      END IF;
      PERFORM log_audit_event('matches', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'DELETE' THEN
      description := 'Match deleted from tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      PERFORM log_audit_event('matches', 'DELETE', OLD.id, to_jsonb(OLD), NULL, description);
      RETURN OLD;
    ELSE
      -- Handle any unexpected operation types to prevent "case not found" errors
      RAISE LOG 'Unexpected trigger operation: %', TG_OP;
      RETURN COALESCE(NEW, OLD);
  END CASE;
END;
$$;

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
      description := 'User created: ' || COALESCE(NEW.discord_username, 'Unknown');
      PERFORM log_audit_event('users', 'CREATE', NEW.id, NULL, to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'UPDATE' THEN
      description := 'User updated: ' || COALESCE(NEW.discord_username, 'Unknown');
      PERFORM log_audit_event('users', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'DELETE' THEN
      description := 'User deleted: ' || COALESCE(OLD.discord_username, 'Unknown');
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
      description := 'Team created: ' || NEW.name;
      PERFORM log_audit_event('teams', 'CREATE', NEW.id, NULL, to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'UPDATE' THEN
      description := 'Team updated: ' || NEW.name;
      PERFORM log_audit_event('teams', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'DELETE' THEN
      description := 'Team deleted: ' || OLD.name;
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
      description := 'Tournament created: ' || NEW.name;
      PERFORM log_audit_event('tournaments', 'CREATE', NEW.id, NULL, to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'UPDATE' THEN
      description := 'Tournament updated: ' || NEW.name;
      PERFORM log_audit_event('tournaments', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'DELETE' THEN
      description := 'Tournament deleted: ' || OLD.name;
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
  user_name text;
  tournament_name text;
  is_checked_in boolean;
BEGIN
  -- Get user and tournament names for context
  SELECT discord_username INTO user_name FROM users WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  SELECT name INTO tournament_name FROM tournaments WHERE id = COALESCE(NEW.tournament_id, OLD.tournament_id);
  
  CASE TG_OP
    WHEN 'INSERT' THEN
      description := 'User "' || COALESCE(user_name, 'Unknown') || '" signed up for tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      PERFORM log_audit_event('tournament_signups', 'CREATE', NEW.id, NULL, to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'UPDATE' THEN
      -- Check if this is a check-in/check-out event
      is_checked_in := COALESCE(NEW.is_checked_in, false);
      IF OLD.is_checked_in IS DISTINCT FROM NEW.is_checked_in THEN
        IF is_checked_in THEN
          description := 'User "' || COALESCE(user_name, 'Unknown') || '" checked in for tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
        ELSE
          description := 'User "' || COALESCE(user_name, 'Unknown') || '" checked out from tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
        END IF;
      ELSE
        description := 'Tournament signup updated for user "' || COALESCE(user_name, 'Unknown') || '" in tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      END IF;
      PERFORM log_audit_event('tournament_signups', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), description);
      RETURN NEW;
    WHEN 'DELETE' THEN
      description := 'User "' || COALESCE(user_name, 'Unknown') || '" withdrew from tournament "' || COALESCE(tournament_name, 'Unknown') || '"';
      PERFORM log_audit_event('tournament_signups', 'DELETE', OLD.id, to_jsonb(OLD), NULL, description);
      RETURN OLD;
    ELSE
      -- Handle any unexpected operation types to prevent "case not found" errors
      RAISE LOG 'Unexpected trigger operation: %', TG_OP;
      RETURN COALESCE(NEW, OLD);
  END CASE;
END;
$$;