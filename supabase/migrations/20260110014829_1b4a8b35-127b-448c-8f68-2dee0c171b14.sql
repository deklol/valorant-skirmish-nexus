-- Phase 1: Add DELETE RLS policy on notifications table
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Phase 1: Add missing notification preference columns
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS match_complete boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS match_started boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS score_confirmation_needed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS tournament_winner boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS team_invite_received boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS tournament_reminder boolean DEFAULT true;