-- Update the trigger function to set the role to 'owner' when auto-adding captain as member
CREATE OR REPLACE FUNCTION public.auto_add_captain_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.persistent_team_members (team_id, user_id, is_captain, role)
  VALUES (NEW.id, NEW.captain_id, true, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also fix any existing team members who are captains but don't have the 'owner' role
UPDATE public.persistent_team_members ptm
SET role = 'owner'
FROM public.persistent_teams pt
WHERE ptm.team_id = pt.id
  AND ptm.user_id = pt.captain_id
  AND (ptm.role IS NULL OR ptm.role != 'owner');