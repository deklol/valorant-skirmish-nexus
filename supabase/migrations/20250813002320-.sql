-- Add notification test mode flag to app settings
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS notification_test_mode boolean NOT NULL DEFAULT false;

-- Optional comment for clarity
COMMENT ON COLUMN public.app_settings.notification_test_mode IS 'When true, notifications are routed only to admin users for testing.';