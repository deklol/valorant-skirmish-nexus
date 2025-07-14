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