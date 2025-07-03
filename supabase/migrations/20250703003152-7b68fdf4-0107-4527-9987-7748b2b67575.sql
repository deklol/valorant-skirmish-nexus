-- Phase 1: Team Tournament Database Schema
-- Add registration type enum for tournaments
CREATE TYPE public.registration_type AS ENUM ('solo', 'team');

-- Add registration_type column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN registration_type public.registration_type DEFAULT 'solo';

-- Create persistent teams table (separate from admin-generated teams)
CREATE TABLE public.persistent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  captain_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create persistent team members table
CREATE TABLE public.persistent_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.persistent_teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  is_captain BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create persistent team invites table
CREATE TABLE public.persistent_team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.persistent_teams(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create team tournament registrations table (separate from individual signups)
CREATE TABLE public.team_tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.persistent_teams(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'registered',
  UNIQUE(tournament_id, team_id)
);

-- Add indexes for performance
CREATE INDEX idx_persistent_teams_captain ON public.persistent_teams(captain_id);
CREATE INDEX idx_persistent_teams_invite_code ON public.persistent_teams(invite_code);
CREATE INDEX idx_persistent_team_members_user ON public.persistent_team_members(user_id);
CREATE INDEX idx_persistent_team_members_team ON public.persistent_team_members(team_id);
CREATE INDEX idx_team_tournament_registrations_tournament ON public.team_tournament_registrations(tournament_id);
CREATE INDEX idx_team_tournament_registrations_team ON public.team_tournament_registrations(team_id);

-- Enable RLS on all new tables
ALTER TABLE public.persistent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistent_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistent_team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tournament_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for persistent_teams
CREATE POLICY "Anyone can view active teams" 
ON public.persistent_teams 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can create teams" 
ON public.persistent_teams 
FOR INSERT 
WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Team captains can update their teams" 
ON public.persistent_teams 
FOR UPDATE 
USING (auth.uid() = captain_id)
WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Team captains can delete their teams" 
ON public.persistent_teams 
FOR DELETE 
USING (auth.uid() = captain_id);

CREATE POLICY "Admins can manage all teams" 
ON public.persistent_teams 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for persistent_team_members
CREATE POLICY "Anyone can view team members" 
ON public.persistent_team_members 
FOR SELECT 
USING (true);

CREATE POLICY "Team captains can manage members" 
ON public.persistent_team_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.persistent_teams 
    WHERE id = team_id AND captain_id = auth.uid()
  )
);

CREATE POLICY "Users can join teams" 
ON public.persistent_team_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave teams" 
ON public.persistent_team_members 
FOR DELETE 
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.persistent_teams 
  WHERE id = team_id AND captain_id = auth.uid()
));

-- RLS Policies for persistent_team_invites
CREATE POLICY "Team members can view team invites" 
ON public.persistent_team_invites 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.persistent_team_members 
    WHERE team_id = persistent_team_invites.team_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Team captains can manage invites" 
ON public.persistent_team_invites 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.persistent_teams 
    WHERE id = team_id AND captain_id = auth.uid()
  )
);

-- RLS Policies for team_tournament_registrations
CREATE POLICY "Anyone can view team registrations" 
ON public.team_tournament_registrations 
FOR SELECT 
USING (true);

CREATE POLICY "Team captains can register their teams" 
ON public.team_tournament_registrations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.persistent_teams 
    WHERE id = team_id AND captain_id = auth.uid()
  )
);

CREATE POLICY "Team captains can manage their registrations" 
ON public.team_tournament_registrations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.persistent_teams 
    WHERE id = team_id AND captain_id = auth.uid()
  )
);

CREATE POLICY "Team captains can withdraw their teams" 
ON public.team_tournament_registrations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.persistent_teams 
    WHERE id = team_id AND captain_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all team registrations" 
ON public.team_tournament_registrations 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Function to generate unique 4-digit invite codes
CREATE OR REPLACE FUNCTION public.generate_team_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 4-digit code
    code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if code already exists in active teams
    SELECT EXISTS(
      SELECT 1 FROM public.persistent_teams 
      WHERE invite_code = code AND is_active = true
    ) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce one team per user constraint
CREATE OR REPLACE FUNCTION public.enforce_one_team_per_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is already in another team
  IF EXISTS (
    SELECT 1 FROM public.persistent_team_members 
    WHERE user_id = NEW.user_id AND team_id != NEW.team_id
  ) THEN
    RAISE EXCEPTION 'User can only be a member of one team at a time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce one team per user
CREATE TRIGGER enforce_one_team_per_user_trigger
  BEFORE INSERT OR UPDATE ON public.persistent_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_one_team_per_user();

-- Function to auto-generate invite code when team is created
CREATE OR REPLACE FUNCTION public.auto_generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_team_invite_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating invite codes
CREATE TRIGGER auto_generate_invite_code_trigger
  BEFORE INSERT ON public.persistent_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_invite_code();

-- Function to auto-add captain as team member
CREATE OR REPLACE FUNCTION public.auto_add_captain_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.persistent_team_members (team_id, user_id, is_captain)
  VALUES (NEW.id, NEW.captain_id, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-add captain as team member
CREATE TRIGGER auto_add_captain_as_member_trigger
  AFTER INSERT ON public.persistent_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_captain_as_member();