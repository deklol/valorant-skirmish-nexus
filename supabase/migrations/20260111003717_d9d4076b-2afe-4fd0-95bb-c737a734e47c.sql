-- Add social link columns to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS discord_link text,
ADD COLUMN IF NOT EXISTS twitter_link text,
ADD COLUMN IF NOT EXISTS youtube_link text;