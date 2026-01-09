-- Tournament Chat System
-- Stores chat messages per tournament with moderation support

CREATE TABLE public.tournament_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'announcement', 'system')),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_tournament_chat_tournament_id ON public.tournament_chat_messages(tournament_id);
CREATE INDEX idx_tournament_chat_user_id ON public.tournament_chat_messages(user_id);
CREATE INDEX idx_tournament_chat_created_at ON public.tournament_chat_messages(tournament_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.tournament_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can view non-deleted messages in any tournament (admins can see deleted)
CREATE POLICY "Anyone can view chat messages" 
ON public.tournament_chat_messages 
FOR SELECT 
USING (is_deleted = false OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Authenticated users can insert their own messages
CREATE POLICY "Authenticated users can send messages" 
ON public.tournament_chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages (for editing), admins can update any
CREATE POLICY "Users can edit their own messages" 
ON public.tournament_chat_messages 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- User Warnings Table
CREATE TABLE public.user_chat_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  warned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_chat_warnings ENABLE ROW LEVEL SECURITY;

-- Policies for warnings
CREATE POLICY "Users can view their own warnings" 
ON public.user_chat_warnings 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY "Admins can create warnings" 
ON public.user_chat_warnings 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_chat_messages;

-- Add replica identity for realtime updates
ALTER TABLE public.tournament_chat_messages REPLICA IDENTITY FULL;