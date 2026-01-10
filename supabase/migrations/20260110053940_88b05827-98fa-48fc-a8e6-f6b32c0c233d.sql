-- Add banner_image_url column to persistent_teams for team header images
ALTER TABLE public.persistent_teams
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.persistent_teams.banner_image_url IS 'URL for team banner/header image displayed on team cards and profile';