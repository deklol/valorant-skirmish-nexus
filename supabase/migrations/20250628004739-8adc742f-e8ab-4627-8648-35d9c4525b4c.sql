
-- Enhanced audit logging triggers for comprehensive platform monitoring

-- Function to get current user info for logging
CREATE OR REPLACE FUNCTION get_user_info_for_audit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_info jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', u.id,
    'discord_username', u.discord_username,
    'role', u.role
  ) INTO user_info
  FROM users u
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(user_info, '{"id": null, "discord_username": "System", "role": "system"}'::jsonb);
END;
$$;

-- Generic audit logging function
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
    created_at,
    new_values
  ) VALUES (
    p_table_name,
    p_action,
    p_record_id,
    auth.uid(),
    p_old_values,
    p_new_values,
    now(),
    jsonb_build_object(
      'description', p_description,
      'user_info', get_user_info_for_audit(),
      'metadata', p_metadata
    )
  );
END;
$$;

-- Tournament audit logging
CREATE OR REPLACE FUNCTION audit_tournaments()
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
  END CASE;
  RETURN NULL;
END;
$$;

-- Users audit logging
CREATE OR REPLACE FUNCTION audit_users()
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
  END CASE;
  RETURN NULL;
END;
$$;

-- Teams audit logging
CREATE OR REPLACE FUNCTION audit_teams()
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
  END CASE;
  RETURN NULL;
END;
$$;

-- Matches audit logging
CREATE OR REPLACE FUNCTION audit_matches()
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
  END CASE;
  RETURN NULL;
END;
$$;

-- Tournament signups audit logging
CREATE OR REPLACE FUNCTION audit_tournament_signups()
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
  END CASE;
  RETURN NULL;
END;
$$;

-- Create all audit triggers
DROP TRIGGER IF EXISTS audit_tournaments_trigger ON tournaments;
CREATE TRIGGER audit_tournaments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION audit_tournaments();

DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_users();

DROP TRIGGER IF EXISTS audit_teams_trigger ON teams;
CREATE TRIGGER audit_teams_trigger
  AFTER INSERT OR UPDATE OR DELETE ON teams
  FOR EACH ROW EXECUTE FUNCTION audit_teams();

DROP TRIGGER IF EXISTS audit_matches_trigger ON matches;
CREATE TRIGGER audit_matches_trigger
  AFTER INSERT OR UPDATE OR DELETE ON matches
  FOR EACH ROW EXECUTE FUNCTION audit_matches();

DROP TRIGGER IF EXISTS audit_tournament_signups_trigger ON tournament_signups;
CREATE TRIGGER audit_tournament_signups_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tournament_signups
  FOR EACH ROW EXECUTE FUNCTION audit_tournament_signups();

-- Error logging function for application errors
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

-- Add indexes for better audit log performance
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_table_action_idx ON audit_logs (table_name, action);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_record_id_idx ON audit_logs (record_id);
