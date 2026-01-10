import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FaceitAPIResponse {
  nickname: string;
  activated_at: string;
  friend_count: number;
  verified: boolean;
  country: string;
  avatar: string;
  player_id: string;
  games: {
    cs2?: {
      region: string;
      game_player_id: string;
      skill_level: number;
      faceit_elo: number;
      game_player_name: string;
    };
    csgo?: {
      region: string;
      game_player_id: string;
      skill_level: number;
      faceit_elo: number;
      game_player_name: string;
    };
  };
  lifetime: {
    "Total Matches"?: string;
    "Matches"?: string;
    "Wins"?: string;
    "Win Rate %"?: string;
    "Average K/D Ratio"?: string;
    "Average Headshots %"?: string;
    "Longest Win Streak"?: string;
    "ADR"?: string;
  };
  last30: {
    kills: number;
    deaths: number;
    assists: number;
    adr: number;
    kd_ratio: number;
    headshot_pct: number;
    wins: number;
    losses: number;
  };
  steam_data?: {
    cs2_playtime_hours: number;
    profile_creation_date: string;
    vac_banned: boolean;
    game_banned: boolean;
  };
  teams?: Array<{
    team_id: string;
    nickname: string;
    name: string;
    avatar: string;
    game: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { steam_url, user_id } = await req.json();

    if (!steam_url || !user_id) {
      return new Response(
        JSON.stringify({ error: "steam_url and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Steam URL format
    const steamUrlPattern = /^https?:\/\/steamcommunity\.com\/(id\/[a-zA-Z0-9_-]+|profiles\/\d+)\/?$/;
    if (!steamUrlPattern.test(steam_url)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid Steam URL format. Use https://steamcommunity.com/id/username/ or https://steamcommunity.com/profiles/steamid64/" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching FACEIT stats for Steam URL: ${steam_url}`);

    // Fetch from the FACEIT API
    const apiUrl = `https://mobbi.dev/faceit.php?user=${encodeURIComponent(steam_url)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`FACEIT API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch FACEIT data. The user may not have a FACEIT account linked to this Steam profile." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const faceitData: FaceitAPIResponse = await response.json();

    if (!faceitData || !faceitData.nickname) {
      return new Response(
        JSON.stringify({ error: "No FACEIT account found for this Steam profile" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found FACEIT profile: ${faceitData.nickname}`);

    // Get CS2 data (prefer cs2 over csgo)
    const cs2Data = faceitData.games?.cs2 || faceitData.games?.csgo;

    // Parse lifetime stats
    const lifetimeMatches = parseInt(faceitData.lifetime?.["Matches"] || faceitData.lifetime?.["Total Matches"] || "0");
    const lifetimeWins = parseInt(faceitData.lifetime?.["Wins"] || "0");
    const lifetimeWinRate = parseFloat(faceitData.lifetime?.["Win Rate %"] || "0");
    const lifetimeAvgKd = parseFloat(faceitData.lifetime?.["Average K/D Ratio"] || "0");
    const lifetimeAvgHs = parseFloat(faceitData.lifetime?.["Average Headshots %"] || "0");
    const longestWinStreak = parseInt(faceitData.lifetime?.["Longest Win Streak"] || "0");
    const lifetimeAdr = parseFloat(faceitData.lifetime?.["ADR"] || "0");

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update user's steam_url
    const { error: userError } = await supabase
      .from("users")
      .update({ steam_url })
      .eq("id", user_id);

    if (userError) {
      console.error("Error updating user steam_url:", userError);
    }

    // Upsert FACEIT stats
    const statsData = {
      user_id,
      steam_url,
      faceit_player_id: faceitData.player_id,
      faceit_nickname: faceitData.nickname,
      faceit_country: faceitData.country,
      faceit_avatar: faceitData.avatar,
      faceit_verified: faceitData.verified,
      faceit_activated_at: faceitData.activated_at,
      
      // CS2 stats
      cs2_skill_level: cs2Data?.skill_level || null,
      cs2_elo: cs2Data?.faceit_elo || null,
      cs2_region: cs2Data?.region || null,
      cs2_game_player_id: cs2Data?.game_player_id || null,
      cs2_game_player_name: cs2Data?.game_player_name || null,
      
      // Lifetime stats
      lifetime_matches: lifetimeMatches || null,
      lifetime_wins: lifetimeWins || null,
      lifetime_win_rate: lifetimeWinRate || null,
      lifetime_avg_kd: lifetimeAvgKd || null,
      lifetime_avg_headshots_pct: lifetimeAvgHs || null,
      lifetime_longest_win_streak: longestWinStreak || null,
      lifetime_adr: lifetimeAdr || null,
      
      // Last 30 days
      last30_kills: faceitData.last30?.kills || null,
      last30_deaths: faceitData.last30?.deaths || null,
      last30_assists: faceitData.last30?.assists || null,
      last30_adr: faceitData.last30?.adr || null,
      last30_kd_ratio: faceitData.last30?.kd_ratio || null,
      last30_headshot_pct: faceitData.last30?.headshot_pct || null,
      last30_wins: faceitData.last30?.wins || null,
      last30_losses: faceitData.last30?.losses || null,
      
      // Steam data
      steam_playtime_hours: faceitData.steam_data?.cs2_playtime_hours || null,
      steam_profile_created_at: faceitData.steam_data?.profile_creation_date 
        ? new Date(faceitData.steam_data.profile_creation_date).toISOString() 
        : null,
      steam_vac_banned: faceitData.steam_data?.vac_banned || false,
      steam_game_banned: faceitData.steam_data?.game_banned || false,
      
      // Teams
      faceit_teams: faceitData.teams || null,
      
      last_fetched_at: new Date().toISOString(),
    };

    const { data: upsertedStats, error: statsError } = await supabase
      .from("faceit_stats")
      .upsert(statsData, { onConflict: "user_id" })
      .select()
      .single();

    if (statsError) {
      console.error("Error upserting FACEIT stats:", statsError);
      return new Response(
        JSON.stringify({ error: "Failed to save FACEIT stats", details: statsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully saved FACEIT stats for ${faceitData.nickname}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: upsertedStats,
        message: `FACEIT stats loaded for ${faceitData.nickname}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fetch-faceit-stats:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
