
-- Enable replica identity FULL for realtime update tracking
ALTER TABLE public.map_veto_actions REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_veto_actions;
