-- 1) Add optional banner image column
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- 2) Public storage bucket for tournament banners (create if missing)
INSERT INTO storage.buckets (id, name, public)
SELECT 'tournament-banners', 'tournament-banners', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'tournament-banners'
);

-- 3) RLS policies for storage.objects (tournament-banners)
DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read access for tournament banners'
  ) THEN
    CREATE POLICY "Public read access for tournament banners"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'tournament-banners');
  END IF;

  -- Admins can upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload tournament banners'
  ) THEN
    CREATE POLICY "Admins can upload tournament banners"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'tournament-banners' AND get_user_role(auth.uid()) = 'admin');
  END IF;

  -- Admins can update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update tournament banners'
  ) THEN
    CREATE POLICY "Admins can update tournament banners"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'tournament-banners' AND get_user_role(auth.uid()) = 'admin')
    WITH CHECK (bucket_id = 'tournament-banners' AND get_user_role(auth.uid()) = 'admin');
  END IF;

  -- Admins can delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete tournament banners'
  ) THEN
    CREATE POLICY "Admins can delete tournament banners"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'tournament-banners' AND get_user_role(auth.uid()) = 'admin');
  END IF;
END $$;