-- Create proper policies for public-assets bucket using users.role column
-- Public read access for public-assets
CREATE POLICY "Public read access for public-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Admins can upload to public-assets
CREATE POLICY "Admins can upload to public-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-assets' 
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admins can update files in public-assets
CREATE POLICY "Admins can update in public-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public-assets' 
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admins can delete files in public-assets  
CREATE POLICY "Admins can delete in public-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-assets' 
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);