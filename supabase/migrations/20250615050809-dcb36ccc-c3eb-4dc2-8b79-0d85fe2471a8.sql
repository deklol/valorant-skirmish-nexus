
-- Allow anyone (including anonymous, logged-out users) to SELECT from app_settings
CREATE POLICY "Anyone can view app settings"
  ON public.app_settings
  FOR SELECT
  TO public
  USING (true);
