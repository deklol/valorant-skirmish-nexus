-- Fix database function security: Add search_path protection to prevent schema injection
-- This fixes the 84 linter warnings about missing search_path settings

-- First, let's update a few key functions that are commonly used
-- We'll add "SET search_path = public" to prevent schema poisoning attacks

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role AS $$
  SET search_path = public;
  SELECT role FROM users WHERE id = user_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_captain(user_id uuid, team_id uuid)
RETURNS boolean AS $$
  SET search_path = public;
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = $1 AND team_id = $2 AND is_captain = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_user_on_team(user_id uuid, team_id uuid)
RETURNS boolean AS $$
  SET search_path = public;
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = $1 AND team_id = $2
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;