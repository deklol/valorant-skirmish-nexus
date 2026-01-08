-- Enable realtime for bracket-related live updates
-- (required for supabase.channel postgres_changes to receive events)

ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;

-- Add tables to realtime publication (idempotent)
DO $$
BEGIN
  -- matches
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;

  -- tournaments
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END;
$$;