CREATE POLICY "Public can view rank history for public profiles"
ON public.rank_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = rank_history.user_id
    AND u.profile_visibility = 'public'
  )
);