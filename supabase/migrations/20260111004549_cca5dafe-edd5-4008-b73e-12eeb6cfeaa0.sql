-- Allow admins to upload to public-assets bucket
CREATE POLICY "Admins can upload to public-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to update public-assets
CREATE POLICY "Admins can update public-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-assets' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to delete from public-assets
CREATE POLICY "Admins can delete from public-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-assets' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);