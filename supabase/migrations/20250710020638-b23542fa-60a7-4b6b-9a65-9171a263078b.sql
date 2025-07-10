-- Enable realtime for map_veto_sessions table
-- This is the primary fix for real-time veto updates not working

-- Ensure REPLICA IDENTITY FULL for proper realtime updates
ALTER TABLE public.map_veto_sessions REPLICA IDENTITY FULL;

-- Add map_veto_sessions to realtime publication
-- This table was missing from realtime publication causing session changes
-- (turn switches, status updates) to not broadcast to other clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_veto_sessions;

-- Verify map_veto_actions is also properly configured (should already be there)
ALTER TABLE public.map_veto_actions REPLICA IDENTITY FULL;

-- Ensure map_veto_actions is in realtime publication (should already be added)
-- Adding conditionally to avoid errors if already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'map_veto_actions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.map_veto_actions;
    END IF;
END $$;