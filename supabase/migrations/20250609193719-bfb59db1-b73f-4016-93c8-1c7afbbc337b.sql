
-- Create table for match result submissions that require confirmation
CREATE TABLE public.match_result_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  score_team1 INTEGER NOT NULL DEFAULT 0,
  score_team2 INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES teams(id),
  submitted_by UUID REFERENCES auth.users(id) NOT NULL,
  confirmed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.match_result_submissions ENABLE ROW LEVEL SECURITY;

-- Allow team captains and admins to view submissions for their matches
CREATE POLICY "Team captains and admins can view match submissions"
  ON public.match_result_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN matches m ON (m.team1_id = tm.team_id OR m.team2_id = tm.team_id)
      WHERE m.id = match_id 
      AND tm.user_id = auth.uid() 
      AND tm.is_captain = true
    )
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- Allow team captains to insert submissions for their matches
CREATE POLICY "Team captains can submit match results"
  ON public.match_result_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN matches m ON (m.team1_id = tm.team_id OR m.team2_id = tm.team_id)
      WHERE m.id = match_id 
      AND tm.user_id = auth.uid() 
      AND tm.is_captain = true
    )
  );

-- Allow team captains and admins to update submissions
CREATE POLICY "Team captains and admins can update match submissions"
  ON public.match_result_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN matches m ON (m.team1_id = tm.team_id OR m.team2_id = tm.team_id)
      WHERE m.id = match_id 
      AND tm.user_id = auth.uid() 
      AND tm.is_captain = true
    )
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- Add trigger to update the updated_at column
CREATE TRIGGER update_match_result_submissions_updated_at
  BEFORE UPDATE ON public.match_result_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
