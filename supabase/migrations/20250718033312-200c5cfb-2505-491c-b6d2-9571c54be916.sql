-- Create sponsors table for managing sponsor logos and information
CREATE TABLE public.sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Create policies for sponsor access
CREATE POLICY "Sponsors are viewable by everyone" 
ON public.sponsors 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage sponsors" 
ON public.sponsors 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sponsors_updated_at
BEFORE UPDATE ON public.sponsors
FOR EACH ROW
EXECUTE FUNCTION public.update_sponsors_updated_at();

-- Create storage bucket for sponsor logos
INSERT INTO storage.buckets (id, name, public) VALUES ('sponsor-logos', 'sponsor-logos', true);

-- Create storage policies for sponsor logos
CREATE POLICY "Sponsor logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sponsor-logos');

CREATE POLICY "Admins can upload sponsor logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sponsor-logos' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update sponsor logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'sponsor-logos' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete sponsor logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'sponsor-logos' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));