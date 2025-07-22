
-- Create push notification subscriptions table
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for push subscriptions
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Create email notification queue table
CREATE TABLE email_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  template_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error_message TEXT
);

-- Enable RLS
ALTER TABLE email_notification_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for email queue
CREATE POLICY "Admins can manage email queue" ON email_notification_queue
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Add email preferences to user notification preferences
ALTER TABLE user_notification_preferences 
ADD COLUMN email_enabled BOOLEAN DEFAULT true,
ADD COLUMN push_enabled BOOLEAN DEFAULT true,
ADD COLUMN email_frequency TEXT DEFAULT 'immediate';

-- Create function to send push notification
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}',
  p_icon TEXT DEFAULT '/icon-192x192.png'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into notifications table for fallback
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, 'push', p_title, p_body, p_data);
  
  -- Note: Actual push sending will be handled by edge function
END;
$$;

-- Create function to queue email notification
CREATE OR REPLACE FUNCTION queue_email_notification(
  p_user_id UUID,
  p_notification_type TEXT,
  p_subject TEXT,
  p_content TEXT,
  p_template_data JSONB DEFAULT '{}',
  p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now()
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_id UUID;
BEGIN
  INSERT INTO email_notification_queue (
    user_id, notification_type, subject, content, template_data, scheduled_for
  ) VALUES (
    p_user_id, p_notification_type, p_subject, p_content, p_template_data, p_scheduled_for
  ) RETURNING id INTO email_id;
  
  RETURN email_id;
END;
$$;

-- Create enhanced notification function that supports both push and email
CREATE OR REPLACE FUNCTION create_enhanced_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_tournament_id UUID DEFAULT NULL,
  p_match_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,
  p_send_push BOOLEAN DEFAULT true,
  p_send_email BOOLEAN DEFAULT false,
  p_email_subject TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
  user_prefs RECORD;
BEGIN
  -- Get user preferences
  SELECT * INTO user_prefs 
  FROM user_notification_preferences 
  WHERE user_id = p_user_id;
  
  -- Create base notification
  INSERT INTO notifications (
    user_id, type, title, message, data, tournament_id, match_id, team_id
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_data, p_tournament_id, p_match_id, p_team_id
  ) RETURNING id INTO notification_id;
  
  -- Send push notification if enabled
  IF p_send_push AND COALESCE(user_prefs.push_enabled, true) THEN
    PERFORM send_push_notification(p_user_id, p_title, p_message, p_data);
  END IF;
  
  -- Queue email notification if enabled
  IF p_send_email AND COALESCE(user_prefs.email_enabled, true) THEN
    PERFORM queue_email_notification(
      p_user_id, 
      p_type, 
      COALESCE(p_email_subject, p_title), 
      p_message,
      jsonb_build_object('notification_data', p_data, 'tournament_id', p_tournament_id, 'match_id', p_match_id, 'team_id', p_team_id)
    );
  END IF;
  
  RETURN notification_id;
END;
$$;
