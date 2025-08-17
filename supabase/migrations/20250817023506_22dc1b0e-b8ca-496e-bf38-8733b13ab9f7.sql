-- Create agent roles enum
CREATE TYPE valorant_role AS ENUM ('Duelist', 'Controller', 'Initiator', 'Sentinel');

-- Add social profile fields to users table
ALTER TABLE users 
ADD COLUMN valorant_agent TEXT,
ADD COLUMN valorant_role valorant_role,
ADD COLUMN status_message TEXT,
ADD COLUMN looking_for_team BOOLEAN DEFAULT FALSE,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create user_follows table for follow system
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    -- Prevent self-follows
    CHECK (follower_id != following_id)
);

-- Enable RLS on user_follows
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Create policies for user_follows
CREATE POLICY "Users can view all follows" ON user_follows
FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON user_follows
FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" ON user_follows
FOR DELETE USING (auth.uid() = follower_id);

-- Create function to get follower/following counts
CREATE OR REPLACE FUNCTION get_user_follow_stats(user_id UUID)
RETURNS TABLE(followers_count INTEGER, following_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM user_follows WHERE following_id = user_id) as followers_count,
        (SELECT COUNT(*)::INTEGER FROM user_follows WHERE follower_id = user_id) as following_count;
END;
$$;