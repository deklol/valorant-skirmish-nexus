
-- Add new fields to tournaments table for flexible match formats and map veto control
ALTER TABLE tournaments 
ADD COLUMN enable_map_veto boolean DEFAULT false,
ADD COLUMN map_veto_required_rounds jsonb DEFAULT '[]'::jsonb,
ADD COLUMN final_match_format match_format DEFAULT NULL,
ADD COLUMN semifinal_match_format match_format DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN tournaments.enable_map_veto IS 'Controls whether map veto is enabled for this tournament';
COMMENT ON COLUMN tournaments.map_veto_required_rounds IS 'Array of round numbers that require map veto (e.g., [3,4] for semifinals and finals)';
COMMENT ON COLUMN tournaments.final_match_format IS 'Override match format for final round (if different from base format)';
COMMENT ON COLUMN tournaments.semifinal_match_format IS 'Override match format for semifinal round (if different from base format)';

-- Add map veto control field to matches table for admin overrides
ALTER TABLE matches 
ADD COLUMN map_veto_enabled boolean DEFAULT NULL;

-- Comment for the new field
COMMENT ON COLUMN matches.map_veto_enabled IS 'Admin override for map veto availability (NULL = use tournament setting, true/false = force enable/disable)';
