-- Enable realtime for map veto tables
ALTER TABLE map_veto_sessions REPLICA IDENTITY FULL;
ALTER TABLE map_veto_actions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE map_veto_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE map_veto_actions;