
-- Add team_size column to tournaments table
ALTER TABLE tournaments ADD COLUMN team_size integer DEFAULT 5;

-- Update maps table to have thumbnail_url column (rename from image_url)
ALTER TABLE maps RENAME COLUMN image_url TO thumbnail_url;
