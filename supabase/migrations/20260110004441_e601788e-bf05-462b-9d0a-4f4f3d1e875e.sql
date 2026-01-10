-- ============================================
-- TEAM TOURNAMENT SYSTEM: Phase 1 - Schema Foundation
-- ============================================

-- 1.1 Team Lifecycle Status Enum (drop first if exists from failed migration)
DROP TYPE IF EXISTS team_lifecycle_status CASCADE;
CREATE TYPE team_lifecycle_status AS ENUM ('active', 'locked', 'disbanded', 'archived');

-- 1.2 Team Member Role Enum (drop first if exists from failed migration)
DROP TYPE IF EXISTS team_member_role CASCADE;
CREATE TYPE team_member_role AS ENUM ('owner', 'manager', 'captain', 'player', 'substitute', 'analyst', 'coach');

-- 1.3 Add lifecycle columns to persistent_teams
ALTER TABLE persistent_teams 
ADD COLUMN IF NOT EXISTS status team_lifecycle_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_reason TEXT,
ADD COLUMN IF NOT EXISTS disbanded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS join_code_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS join_code_generated_at TIMESTAMPTZ DEFAULT now();

-- Migrate existing captains to owners
UPDATE persistent_teams SET owner_id = captain_id WHERE owner_id IS NULL AND captain_id IS NOT NULL;

-- 1.4 Add role column to persistent_team_members
ALTER TABLE persistent_team_members 
ADD COLUMN IF NOT EXISTS role team_member_role DEFAULT 'player';

-- Migrate existing captains: set as owner if they match the team's owner_id
UPDATE persistent_team_members ptm
SET role = 'owner'
WHERE ptm.is_captain = true 
AND EXISTS (
  SELECT 1 FROM persistent_teams pt 
  WHERE pt.id = ptm.team_id AND pt.owner_id = ptm.user_id
);

-- Set remaining is_captain = true as captain role
UPDATE persistent_team_members 
SET role = 'captain' 
WHERE is_captain = true AND role = 'player';

-- 1.5 Join Code History Table (drop if exists from partial migration)
DROP TABLE IF EXISTS team_join_code_history CASCADE;
CREATE TABLE team_join_code_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES persistent_teams(id) ON DELETE CASCADE,
  previous_code TEXT,
  new_code TEXT,
  rotation_trigger TEXT NOT NULL,
  triggered_by UUID REFERENCES auth.users(id),
  rotated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on join code history
ALTER TABLE team_join_code_history ENABLE ROW LEVEL SECURITY;

-- Policy: Team owners and admins can view history
CREATE POLICY "Team owners and admins can view join code history"
ON team_join_code_history FOR SELECT
USING (
  EXISTS (SELECT 1 FROM persistent_teams WHERE id = team_id AND owner_id = auth.uid())
  OR public.is_admin(auth.uid())
);

-- 1.6 Add seeding and check-in columns to team_tournament_registrations
ALTER TABLE team_tournament_registrations 
ADD COLUMN IF NOT EXISTS seed INTEGER,
ADD COLUMN IF NOT EXISTS seeded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS seeded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS check_in_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS roster_snapshot JSONB;

-- Add constraint for check_in_status values (drop first if exists)
ALTER TABLE team_tournament_registrations 
DROP CONSTRAINT IF EXISTS check_in_status_values;
ALTER TABLE team_tournament_registrations 
ADD CONSTRAINT check_in_status_values 
CHECK (check_in_status IN ('pending', 'checked_in', 'no_show'));

-- 1.7 Add tournament phase tracking
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'setup',
ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS roster_lock_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rosters_locked BOOLEAN DEFAULT false;

-- Add constraint for current_phase values (drop first if exists)
ALTER TABLE tournaments 
DROP CONSTRAINT IF EXISTS current_phase_values;
ALTER TABLE tournaments 
ADD CONSTRAINT current_phase_values 
CHECK (current_phase IN ('setup', 'registration', 'seeding', 'check_in', 'bracket_generation', 'live', 'disputes', 'completed', 'review'));

-- 1.8 Match Disputes Table (drop if exists from partial migration)
DROP TABLE IF EXISTS match_disputes CASCADE;
CREATE TABLE match_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id),
  raised_by UUID REFERENCES auth.users(id),
  raised_by_team UUID REFERENCES persistent_teams(id),
  reason TEXT NOT NULL,
  evidence_urls TEXT[],
  status TEXT DEFAULT 'open',
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraint for dispute status values
ALTER TABLE match_disputes 
ADD CONSTRAINT dispute_status_values 
CHECK (status IN ('open', 'under_review', 'resolved', 'rejected'));

-- Enable RLS on disputes
ALTER TABLE match_disputes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view disputes they raised
CREATE POLICY "Users can view their disputes"
ON match_disputes FOR SELECT
USING (raised_by = auth.uid() OR public.is_admin(auth.uid()));

-- Policy: Users can create disputes
CREATE POLICY "Users can create disputes"
ON match_disputes FOR INSERT
WITH CHECK (raised_by = auth.uid());

-- Policy: Only admins can update disputes
CREATE POLICY "Admins can update disputes"
ON match_disputes FOR UPDATE
USING (public.is_admin(auth.uid()));

-- 1.9 One-team-per-user enforcement trigger
CREATE OR REPLACE FUNCTION enforce_one_team_per_user()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM persistent_team_members ptm
    JOIN persistent_teams pt ON pt.id = ptm.team_id
    WHERE ptm.user_id = NEW.user_id 
    AND pt.status IN ('active', 'locked')
    AND ptm.team_id != NEW.team_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to an active team';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_enforce_one_team_per_user ON persistent_team_members;
CREATE TRIGGER trg_enforce_one_team_per_user
BEFORE INSERT ON persistent_team_members
FOR EACH ROW EXECUTE FUNCTION enforce_one_team_per_user();

-- ============================================
-- Phase 2: Database Functions
-- ============================================

-- 2.1 Join Code Rotation Function
CREATE OR REPLACE FUNCTION rotate_team_join_code(
  p_team_id UUID, 
  p_trigger TEXT,
  p_triggered_by UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_code TEXT;
  v_new_code TEXT;
BEGIN
  SELECT invite_code INTO v_old_code FROM persistent_teams WHERE id = p_team_id;
  
  -- Generate unique 6-char alphanumeric code
  LOOP
    v_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM persistent_teams WHERE invite_code = v_new_code);
  END LOOP;
  
  UPDATE persistent_teams 
  SET invite_code = v_new_code, 
      join_code_version = COALESCE(join_code_version, 0) + 1,
      join_code_generated_at = now(),
      updated_at = now()
  WHERE id = p_team_id;
  
  INSERT INTO team_join_code_history (team_id, previous_code, new_code, rotation_trigger, triggered_by)
  VALUES (p_team_id, v_old_code, v_new_code, p_trigger, COALESCE(p_triggered_by, auth.uid()));
  
  RETURN v_new_code;
END;
$$;

-- 2.2 Membership Change Trigger for Code Rotation
CREATE OR REPLACE FUNCTION trigger_rotate_code_on_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM rotate_team_join_code(NEW.team_id, 'player_join', NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM persistent_teams WHERE id = OLD.team_id AND status = 'active') THEN
      PERFORM rotate_team_join_code(OLD.team_id, 'player_leave', OLD.user_id);
    END IF;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_rotate_code_on_member_change ON persistent_team_members;
CREATE TRIGGER trg_rotate_code_on_member_change
AFTER INSERT OR DELETE ON persistent_team_members
FOR EACH ROW EXECUTE FUNCTION trigger_rotate_code_on_membership_change();

-- 2.3 Ownership Transfer Function
CREATE OR REPLACE FUNCTION transfer_team_ownership(
  p_team_id UUID, 
  p_new_owner_id UUID,
  p_new_role_for_old_owner team_member_role DEFAULT 'manager'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_owner_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  SELECT owner_id INTO v_current_owner_id FROM persistent_teams WHERE id = p_team_id;
  
  IF v_current_owner_id IS NULL OR v_current_owner_id != v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the current owner can transfer ownership');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM persistent_team_members WHERE team_id = p_team_id AND user_id = p_new_owner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'New owner must be a current team member');
  END IF;
  
  UPDATE persistent_teams 
  SET owner_id = p_new_owner_id, 
      captain_id = p_new_owner_id,
      updated_at = now()
  WHERE id = p_team_id;
  
  UPDATE persistent_team_members SET role = 'owner' WHERE team_id = p_team_id AND user_id = p_new_owner_id;
  UPDATE persistent_team_members SET role = p_new_role_for_old_owner WHERE team_id = p_team_id AND user_id = v_current_owner_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2.4 Team Lock Function
CREATE OR REPLACE FUNCTION lock_team(p_team_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can lock teams');
  END IF;

  UPDATE persistent_teams 
  SET status = 'locked', locked_at = now(), locked_reason = p_reason, updated_at = now()
  WHERE id = p_team_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found or not in active state');
  END IF;
  
  PERFORM rotate_team_join_code(p_team_id, 'team_lock', auth.uid());
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2.5 Team Unlock Function
CREATE OR REPLACE FUNCTION unlock_team(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can unlock teams');
  END IF;

  UPDATE persistent_teams 
  SET status = 'active', locked_at = NULL, locked_reason = NULL, updated_at = now()
  WHERE id = p_team_id AND status = 'locked';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found or not in locked state');
  END IF;
  
  PERFORM rotate_team_join_code(p_team_id, 'team_unlock', auth.uid());
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2.6 Team Disband Function
CREATE OR REPLACE FUNCTION disband_team(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  SELECT owner_id INTO v_owner_id FROM persistent_teams WHERE id = p_team_id;
  
  IF v_owner_id != v_caller_id AND NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only team owner or admin can disband team');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM team_tournament_registrations ttr
    JOIN tournaments t ON t.id = ttr.tournament_id
    WHERE ttr.team_id = p_team_id AND t.status IN ('open', 'balancing', 'live')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot disband team while registered in active tournament');
  END IF;
  
  UPDATE persistent_teams 
  SET status = 'disbanded', 
      disbanded_at = now(), 
      is_active = false,
      updated_at = now()
  WHERE id = p_team_id;
  
  DELETE FROM persistent_team_members WHERE team_id = p_team_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2.7 Team Seeding Functions
CREATE OR REPLACE FUNCTION set_team_seed(
  p_registration_id UUID,
  p_seed INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can set seeds');
  END IF;
  
  UPDATE team_tournament_registrations
  SET seed = p_seed, seeded_at = now(), seeded_by = auth.uid()
  WHERE id = p_registration_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION auto_seed_by_rank_points(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed INTEGER := 1;
  v_reg RECORD;
  v_count INTEGER := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can auto-seed');
  END IF;
  
  FOR v_reg IN 
    SELECT ttr.id, pt.total_rank_points
    FROM team_tournament_registrations ttr
    JOIN persistent_teams pt ON pt.id = ttr.team_id
    WHERE ttr.tournament_id = p_tournament_id AND ttr.status = 'registered'
    ORDER BY COALESCE(pt.total_rank_points, 0) DESC
  LOOP
    UPDATE team_tournament_registrations
    SET seed = v_seed, seeded_at = now(), seeded_by = auth.uid()
    WHERE id = v_reg.id;
    v_seed := v_seed + 1;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'teams_seeded', v_count);
END;
$$;

-- 2.8 Team Check-in Function
CREATE OR REPLACE FUNCTION team_check_in(p_tournament_id UUID, p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_member_role team_member_role;
BEGIN
  SELECT role INTO v_member_role 
  FROM persistent_team_members 
  WHERE team_id = p_team_id AND user_id = v_caller_id;
  
  IF v_member_role IS NULL OR v_member_role NOT IN ('owner', 'manager', 'captain') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only team leadership can check in');
  END IF;
  
  UPDATE team_tournament_registrations
  SET check_in_status = 'checked_in', 
      checked_in_at = now(), 
      checked_in_by = v_caller_id,
      roster_snapshot = (
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', ptm.user_id,
          'role', ptm.role,
          'discord_username', u.discord_username,
          'current_rank', u.current_rank,
          'rank_points', u.rank_points
        ))
        FROM persistent_team_members ptm
        JOIN users u ON u.id = ptm.user_id
        WHERE ptm.team_id = p_team_id
      )
  WHERE tournament_id = p_tournament_id AND team_id = p_team_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2.9 Admin Force Check-in
CREATE OR REPLACE FUNCTION admin_force_check_in(p_tournament_id UUID, p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can force check-in');
  END IF;
  
  UPDATE team_tournament_registrations
  SET check_in_status = 'checked_in', 
      checked_in_at = now(), 
      checked_in_by = auth.uid(),
      roster_snapshot = (
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', ptm.user_id,
          'role', ptm.role,
          'discord_username', u.discord_username,
          'current_rank', u.current_rank,
          'rank_points', u.rank_points
        ))
        FROM persistent_team_members ptm
        JOIN users u ON u.id = ptm.user_id
        WHERE ptm.team_id = p_team_id
      )
  WHERE tournament_id = p_tournament_id AND team_id = p_team_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2.10 Mark No-Show
CREATE OR REPLACE FUNCTION mark_team_no_show(p_tournament_id UUID, p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can mark no-shows');
  END IF;
  
  UPDATE team_tournament_registrations
  SET check_in_status = 'no_show', status = 'withdrawn'
  WHERE tournament_id = p_tournament_id AND team_id = p_team_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;