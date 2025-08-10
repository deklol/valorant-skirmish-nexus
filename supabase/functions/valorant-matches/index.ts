import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  profile_user_id?: string;
  riot_id?: string; // e.g. "Player#TAG"
  size?: number; // number of matches
}

interface HenrikAccountResponse {
  status: number;
  data?: {
    puuid: string;
    region: string;
    name: string;
    tag: string;
    account_level?: number;
  };
  errors?: any;
}

interface HenrikMatchesResponse {
  status: number;
  data?: any[]; // pass-through from API
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const henrikApiKey = Deno.env.get('HENRIK_API_KEY'); // optional but recommended

    const supabase = createClient(supabaseUrl, serviceKey);

    const { profile_user_id, riot_id: riotIdInput, size = 10 } = (await req.json()) as RequestBody;

    let riotId = riotIdInput;

    if (!riotId && profile_user_id) {
      const { data: user, error } = await supabase
        .from('users')
        .select('riot_id')
        .eq('id', profile_user_id)
        .single();

      if (error) throw error;
      riotId = user?.riot_id || null;
    }

    if (!riotId || typeof riotId !== 'string' || !riotId.includes('#')) {
      return new Response(JSON.stringify({ error: 'Riot ID not set or invalid for this user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [name, tag] = riotId.split('#');

    // 1) Resolve account -> get puuid and region
    const accountUrl = `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
    const accountRes = await fetch(accountUrl, {
      headers: henrikApiKey ? { Authorization: `Bearer ${henrikApiKey}` } : undefined,
    });
    const accountJson = (await accountRes.json()) as HenrikAccountResponse;

    if (!accountRes.ok || accountJson.status !== 200 || !accountJson.data) {
      console.error('Account lookup failed:', accountJson);
      return new Response(JSON.stringify({ error: 'Failed to resolve account from Riot ID' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { puuid, region } = accountJson.data;

    // 2) Fetch recent matches by puuid
    // NOTE: The v3 matches endpoint is what contains the detailed shot counts
    const params = new URLSearchParams();
    if (size) params.set('size', String(size));

    const matchesUrl = `https://api.henrikdev.xyz/valorant/v3/by-puuid/matches/${encodeURIComponent(region)}/${encodeURIComponent(puuid)}?${params.toString()}`;
    const matchesRes = await fetch(matchesUrl, {
      headers: henrikApiKey ? { Authorization: `Bearer ${henrikApiKey}` } : undefined,
    });
    const matchesJson = (await matchesRes.json()) as HenrikMatchesResponse;

    if (!matchesRes.ok || matchesJson.status !== 200 || !matchesJson.data) {
      console.error('Matches lookup failed:', matchesJson);
      return new Response(JSON.stringify({ error: 'Failed to fetch matches' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3) Create a simplified payload with per-match user summary
    const simplified = matchesJson.data.map((m: any) => {
      const metadata = m.metadata || {};
      const teams = m.teams || {};
      const allPlayers = m.players?.all_players || [];

      const me = allPlayers.find((p: any) => p?.puuid === puuid);
      const userTeam = me?.team?.toLowerCase();
      const teamStats = userTeam ? teams[userTeam] : undefined;
      const enemyStats = userTeam === 'red' ? teams['blue'] : teams['red'];

      // --- HEADSHOT PERCENTAGE CALCULATION ---
      let headshotPercent = null;
      const playerStats = me?.stats;
      if (playerStats && typeof playerStats.headshots === 'number' && typeof playerStats.bodyshots === 'number' && typeof playerStats.legshots === 'number') {
          const totalShots = playerStats.headshots + playerStats.bodyshots + playerStats.legshots;
          if (totalShots > 0) {
              headshotPercent = Math.round((playerStats.headshots / totalShots) * 100);
          }
      }
      // --- END OF CALCULATION ---

      return {
        match_id: m.metadata?.matchid || m.match_id,
        map: metadata?.map || metadata?.map_name,
        mode: metadata?.mode,
        started_at: metadata?.game_start_patched || metadata?.game_start,
        rounds_played: metadata?.rounds_played,
        region,
        user: me
          ? {
              name: `${me.name}#${me.tag}`,
              team: me.team,
              character: me.character,
              kills: me.stats?.kills,
              deaths: me.stats?.deaths,
              assists: me.stats?.assists,
              kda: me.stats ? `${me.stats.kills}/${me.stats.deaths}/${me.stats.assists}` : null,
              headshot_percent: headshotPercent, // Use our calculated value
            }
          : null,
        result: teamStats
          ? {
              won: !!teamStats.has_won,
              team_score: teamStats.rounds_won,
              enemy_score: enemyStats?.rounds_won ?? null,
            }
          : null,
      };
    });

    return new Response(
      JSON.stringify({ puuid, region, matches: simplified }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in valorant-matches function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
