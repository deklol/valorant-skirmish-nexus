-- Fix RLS policy for tournament_page_views to allow tracking function to insert
-- First drop the existing restrictive policy
DROP POLICY IF EXISTS "System can insert page views" ON tournament_page_views;

-- Create a new permissive policy that allows the tracking function to work
CREATE POLICY "Allow page view tracking" ON tournament_page_views
  FOR INSERT
  WITH CHECK (true);

-- Also allow anyone to read page view counts (for displaying the counter)
DROP POLICY IF EXISTS "Admins can view all page views" ON tournament_page_views;

CREATE POLICY "Anyone can view page view counts" ON tournament_page_views
  FOR SELECT
  USING (true);