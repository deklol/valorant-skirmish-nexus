-- Create VODs table for tournament video recordings
CREATE TABLE public.vods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL, -- YouTube/Twitch URL
  thumbnail_url TEXT, -- Optional custom thumbnail
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  casters TEXT[], -- Array of caster names
  production_team TEXT[], -- Array of production team members
  video_platform TEXT NOT NULL DEFAULT 'youtube', -- 'youtube' or 'twitch'
  embed_id TEXT, -- Extracted video ID for embedding
  duration_minutes INTEGER, -- Video duration in minutes
  view_count INTEGER DEFAULT 0, -- Track views
  is_featured BOOLEAN DEFAULT false, -- Featured VODs
  is_active BOOLEAN DEFAULT true, -- Hide/show VODs
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active VODs" 
ON public.vods 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage VODs" 
ON public.vods 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_vods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_vods_updated_at
  BEFORE UPDATE ON public.vods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vods_updated_at();

-- Create function to extract embed ID from URL
CREATE OR REPLACE FUNCTION public.extract_video_embed_id(video_url TEXT, platform TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE platform
    WHEN 'youtube' THEN
      -- Extract YouTube video ID from various URL formats
      IF video_url ~ 'youtube\.com/watch\?v=([^&]+)' THEN
        RETURN substring(video_url from 'youtube\.com/watch\?v=([^&]+)');
      ELSIF video_url ~ 'youtu\.be/([^?]+)' THEN
        RETURN substring(video_url from 'youtu\.be/([^?]+)');
      ELSIF video_url ~ 'youtube\.com/embed/([^?]+)' THEN
        RETURN substring(video_url from 'youtube\.com/embed/([^?]+)');
      END IF;
    WHEN 'twitch' THEN
      -- Extract Twitch video ID from URL
      IF video_url ~ 'twitch\.tv/videos/(\d+)' THEN
        RETURN substring(video_url from 'twitch\.tv/videos/(\d+)');
      END IF;
  END CASE;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically extract embed_id
CREATE OR REPLACE FUNCTION public.auto_extract_embed_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.embed_id = public.extract_video_embed_id(NEW.video_url, NEW.video_platform);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_extract_embed_id_trigger
  BEFORE INSERT OR UPDATE ON public.vods
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_extract_embed_id();