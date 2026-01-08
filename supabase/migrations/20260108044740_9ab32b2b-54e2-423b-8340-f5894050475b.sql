-- 1) Ensure matches are readable (no PII) so bracket preview can load
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view matches" ON public.matches;
CREATE POLICY "Public can view matches"
ON public.matches
FOR SELECT
USING (true);

-- 2) Ensure tournaments flags can be read by clients that need to show status
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tournament generation flags" ON public.tournaments;
CREATE POLICY "Public can view tournament generation flags"
ON public.tournaments
FOR SELECT
USING (true);

-- 3) Replace complete_bracket_generation with a version that always clears generating_bracket
DROP FUNCTION IF EXISTS public.complete_bracket_generation(uuid, boolean);

CREATE FUNCTION public.complete_bracket_generation(
  p_tournament_id uuid,
  p_success boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.tournaments WHERE id = p_tournament_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'TOURNAMENT_NOT_FOUND');
  END IF;

  UPDATE public.tournaments
  SET
    generating_bracket = false,
    bracket_generated = CASE WHEN p_success THEN true ELSE bracket_generated END,
    updated_at = now()
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_bracket_generation(uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_bracket_generation(uuid, boolean) TO authenticated;
