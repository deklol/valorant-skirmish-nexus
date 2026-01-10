-- Create storage bucket for team banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-banners', 'team-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for team banner uploads
-- Anyone can view team banners (public)
CREATE POLICY "Team banners are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'team-banners');

-- Team owners and managers can upload their team's banner
CREATE POLICY "Team managers can upload banners" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'team-banners' 
  AND EXISTS (
    SELECT 1 FROM persistent_team_members ptm
    WHERE ptm.user_id = auth.uid()
    AND ptm.role IN ('owner', 'manager')
    AND (storage.foldername(name))[1] = ptm.team_id::text
  )
);

-- Team owners and managers can update their team's banner
CREATE POLICY "Team managers can update banners" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'team-banners' 
  AND EXISTS (
    SELECT 1 FROM persistent_team_members ptm
    WHERE ptm.user_id = auth.uid()
    AND ptm.role IN ('owner', 'manager')
    AND (storage.foldername(name))[1] = ptm.team_id::text
  )
);

-- Team owners and managers can delete their team's banner
CREATE POLICY "Team managers can delete banners" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'team-banners' 
  AND EXISTS (
    SELECT 1 FROM persistent_team_members ptm
    WHERE ptm.user_id = auth.uid()
    AND ptm.role IN ('owner', 'manager')
    AND (storage.foldername(name))[1] = ptm.team_id::text
  )
);