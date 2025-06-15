
-- 1. Create the app_settings table for global config
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL DEFAULT 'Tournament App',
  announcement_id uuid NULL, -- references announcements
  twitch_embed_enabled boolean NOT NULL DEFAULT false,
  twitch_channel text NULL,
  last_updated_at timestamp with time zone DEFAULT now()
);

-- 2. Reference announcements for global front page use
ALTER TABLE public.app_settings
  ADD CONSTRAINT fk_announcement
  FOREIGN KEY (announcement_id) REFERENCES announcements(id);

-- 3. Enable Row Level Security for admin updates and select
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can select app settings
CREATE POLICY "Admins can view app settings"
  ON public.app_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update app settings
CREATE POLICY "Admins can update app settings"
  ON public.app_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert app settings (only needed for initial install)
CREATE POLICY "Admins can insert app settings"
  ON public.app_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Only allow one row (enforce via uniqueness, UI should update not insert)
CREATE UNIQUE INDEX ON public.app_settings((true));

-- 5. Add an edge function to download the schema (for later in code)
