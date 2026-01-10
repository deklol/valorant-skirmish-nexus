-- Delete the empty team (has no members)
DELETE FROM persistent_teams WHERE id = 'bdea57e5-37f3-4269-a666-14eae6a4dee2';

-- Create RPC function for admin team management
CREATE OR REPLACE FUNCTION public.admin_delete_team(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete teams';
  END IF;
  
  -- Delete team members first
  DELETE FROM persistent_team_members WHERE team_id = p_team_id;
  
  -- Delete team tournament registrations
  DELETE FROM team_tournament_registrations WHERE team_id = p_team_id;
  
  -- Delete team join code history
  DELETE FROM team_join_code_history WHERE team_id = p_team_id;
  
  -- Delete team invites
  DELETE FROM persistent_team_invites WHERE team_id = p_team_id;
  
  -- Delete the team
  DELETE FROM persistent_teams WHERE id = p_team_id;
  
  RETURN TRUE;
END;
$$;

-- Create RPC function for admin to update team info
CREATE OR REPLACE FUNCTION public.admin_update_team(
  p_team_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_status team_lifecycle_status DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_captain_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_owner_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update teams';
  END IF;
  
  -- Get current owner
  SELECT owner_id INTO v_old_owner_id FROM persistent_teams WHERE id = p_team_id;
  
  -- Update team with non-null values
  UPDATE persistent_teams SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status, status),
    owner_id = COALESCE(p_owner_id, owner_id),
    captain_id = COALESCE(p_captain_id, captain_id),
    updated_at = now()
  WHERE id = p_team_id;
  
  -- If owner changed, update member roles
  IF p_owner_id IS NOT NULL AND p_owner_id != v_old_owner_id THEN
    -- Set old owner to player
    UPDATE persistent_team_members 
    SET role = 'player' 
    WHERE team_id = p_team_id AND user_id = v_old_owner_id;
    
    -- Set new owner to owner role
    UPDATE persistent_team_members 
    SET role = 'owner' 
    WHERE team_id = p_team_id AND user_id = p_owner_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create RPC function for admin to update member role
CREATE OR REPLACE FUNCTION public.admin_update_member_role(
  p_team_id UUID,
  p_user_id UUID,
  p_role team_member_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update member roles';
  END IF;
  
  UPDATE persistent_team_members 
  SET role = p_role 
  WHERE team_id = p_team_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Create RPC function for admin to remove member
CREATE OR REPLACE FUNCTION public.admin_remove_team_member(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can remove team members';
  END IF;
  
  DELETE FROM persistent_team_members 
  WHERE team_id = p_team_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Create RPC function for admin to add member to team
CREATE OR REPLACE FUNCTION public.admin_add_team_member(
  p_team_id UUID,
  p_user_id UUID,
  p_role team_member_role DEFAULT 'player'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can add team members';
  END IF;
  
  -- Check if user is already on a team
  IF EXISTS (SELECT 1 FROM persistent_team_members WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'User is already on a team';
  END IF;
  
  INSERT INTO persistent_team_members (team_id, user_id, role)
  VALUES (p_team_id, p_user_id, p_role);
  
  RETURN TRUE;
END;
$$;