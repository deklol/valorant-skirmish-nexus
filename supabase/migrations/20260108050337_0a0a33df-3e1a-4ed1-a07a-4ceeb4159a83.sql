-- Fix bracket lock release and provide safe public RPCs for bracket preview

-- 1) Ensure complete_bracket_generation ALWAYS clears generating_bracket
CREATE OR REPLACE FUNCTION public.complete_bracket_generation(
  p_tournament_id uuid,
  p_success boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always clear the lock; only set bracket_generated on success
  UPDATE public.tournaments
  SET
    generating_bracket = false,
    bracket_generated = CASE WHEN p_success THEN true ELSE bracket_generated END,
    updated_at = now()
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'TOURNAMENT_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_bracket_generation(uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_bracket_generation(uuid, boolean) TO authenticated;

-- 2) Safe public meta for bracket view (prevents needing broad SELECT on tournaments)
CREATE OR REPLACE FUNCTION public.get_bracket_tournament_meta(
  p_tournament_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  max_teams integer,
  bracket_type text,
  match_format text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.status::text,
    t.max_teams,
    t.bracket_type::text,
    t.match_format::text
  FROM public.tournaments t
  WHERE t.id = p_tournament_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_bracket_tournament_meta(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bracket_tournament_meta(uuid) TO authenticated;

-- 3) Safe public matches payload for bracket view (includes team names)
CREATE OR REPLACE FUNCTION public.get_bracket_matches(
  p_tournament_id uuid
)
RETURNS TABLE (
  id uuid,
  tournament_id uuid,
  round_number integer,
  match_number integer,
  team1_id uuid,
  team2_id uuid,
  winner_id uuid,
  status text,
  score_team1 integer,
  score_team2 integer,
  scheduled_time timestamptz,
  map_veto_enabled boolean,
  team1 jsonb,
  team2 jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.tournament_id,
    m.round_number,
    m.match_number,
    m.team1_id,
    m.team2_id,
    m.winner_id,
    m.status::text,
    COALESCE(m.score_team1, 0) as score_team1,
    COALESCE(m.score_team2, 0) as score_team2,
    m.scheduled_time,
    COALESCE(m.map_veto_enabled, false) as map_veto_enabled,
    CASE WHEN t1.id IS NULL THEN NULL ELSE jsonb_build_object('id', t1.id, 'name', t1.name) END as team1,
    CASE WHEN t2.id IS NULL THEN NULL ELSE jsonb_build_object('id', t2.id, 'name', t2.name) END as team2
  FROM public.matches m
  LEFT JOIN public.teams t1 ON t1.id = m.team1_id
  LEFT JOIN public.teams t2 ON t2.id = m.team2_id
  WHERE m.tournament_id = p_tournament_id
  ORDER BY m.round_number ASC, m.match_number ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_bracket_matches(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bracket_matches(uuid) TO authenticated;
