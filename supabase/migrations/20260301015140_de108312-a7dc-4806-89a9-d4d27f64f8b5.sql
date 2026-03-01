-- Add policy so authenticated (non-admin) users can also see public user data (non-banned)
CREATE POLICY "Authenticated users can view public user data"
ON public.users
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (is_banned IS NOT TRUE);