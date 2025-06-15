
-- Enable Row Level Security (RLS) if not already enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow backend function-based inserts via SECURITY DEFINER (e.g., create_notification)
-- Only WITH CHECK (true) is allowed for INSERT, not USING
CREATE POLICY "Allow backend function to insert notifications for any user"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- No USING clause for INSERT; WITH CHECK (true) allows inserts by security definer functions.
