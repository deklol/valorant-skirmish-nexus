
-- Enable real-time on the match_result_submissions table by setting REPLICA IDENTITY FULL
ALTER TABLE public.match_result_submissions REPLICA IDENTITY FULL;

-- Add match_result_submissions table to supabase_realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_result_submissions;
