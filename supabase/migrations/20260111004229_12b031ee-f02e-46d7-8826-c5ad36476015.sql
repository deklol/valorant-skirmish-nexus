-- Add sidebar logo URL column to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS sidebar_logo_url text;