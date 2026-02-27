import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Edge function: fetch-valorant-tracker-stats
 * 
 * Scrapes tracker.gg Valorant competitive profile using Firecrawl,
 * parses the returned markdown for ranked stats, and stores them
 * in the valorant_tracker_stats table.
 * 
 * Input: { user_id: string }
 * - Looks up the user's riot_id from the users table
 * - Constructs tracker.gg URL
 * - Scrapes via Firecrawl
 * - Parses stats from markdown
 * - Upserts into valorant_tracker_stats
 */

interface ParsedStats {
  current_rank: string | null;
  current_rr: number | null;
  peak_rank: string | null;
  peak_rank_act: string | null;
  win_rate: number | null;
  wins: number | null;
  losses: number | null;
  kd_ratio: number | null;
  kda_ratio: number | null;
  headshot_pct: number | null;
  avg_damage_per_round: number | null;
  avg_combat_score: number | null;
  kills_per_round: number | null;
  first_bloods_per_round: number | null;
  top_agents: Array<{ name: string; games?: number; win_rate?: number; kd?: number }>;
  top_weapons: Array<{ name: string; headshot_pct?: number; kills?: number }>;
}

/**
 * Constructs the tracker.gg URL from a Riot ID.
 * Riot ID format: "Name#Tag" -> URL-encoded as "Name%23Tag"
 */
function buildTrackerUrl(riotId: string): string {
  // Riot ID contains # separator — encode it for URL
  const encoded = riotId.replace('#', '%23');
  return `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(encoded).replace(/%2523/g, '%23')}/overview?playlist=competitive`;
}

/**
 * Alternative URL construction that handles special characters better.
 * tracker.gg expects the riot ID with %23 for the # character.
 */
function buildTrackerUrlSafe(riotId: string): string {
  const [name, tag] = riotId.split('#');
  if (!name || !tag) {
    throw new Error(`Invalid Riot ID format: "${riotId}". Expected "Name#Tag"`);
  }
  // Encode the name part (handles unicode chars like ツ)
  const encodedName = encodeURIComponent(name);
  const encodedTag = encodeURIComponent(tag);
  return `https://tracker.gg/valorant/profile/riot/${encodedName}%23${encodedTag}/overview?playlist=competitive`;
}

/**
 * Extracts a numeric value from text like "1.23" or "45.6%"
 */
function extractNumber(text: string): number | null {
  const match = text.match(/([\d,]+\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

/**
 * Parses the markdown content from tracker.gg to extract Valorant stats.
 * This is the core parsing logic — it handles the typical tracker.gg markdown structure.
 * 
 * Note: tracker.gg's structure may change, so this parser is designed to be
 * lenient and extract what it can without failing hard.
 */
function parseTrackerMarkdown(markdown: string): ParsedStats {
  const stats: ParsedStats = {
    current_rank: null,
    current_rr: null,
    peak_rank: null,
    peak_rank_act: null,
    win_rate: null,
    wins: null,
    losses: null,
    kd_ratio: null,
    kda_ratio: null,
    headshot_pct: null,
    avg_damage_per_round: null,
    avg_combat_score: null,
    kills_per_round: null,
    first_bloods_per_round: null,
    top_agents: [],
    top_weapons: [],
  };

  const lines = markdown.split('\n');
  const fullText = markdown.toLowerCase();

  // --- Rank extraction ---
  // Look for rank patterns like "Diamond 2", "Immortal 3", "Radiant"
  const rankNames = [
    'Iron 1', 'Iron 2', 'Iron 3',
    'Bronze 1', 'Bronze 2', 'Bronze 3',
    'Silver 1', 'Silver 2', 'Silver 3',
    'Gold 1', 'Gold 2', 'Gold 3',
    'Platinum 1', 'Platinum 2', 'Platinum 3',
    'Diamond 1', 'Diamond 2', 'Diamond 3',
    'Ascendant 1', 'Ascendant 2', 'Ascendant 3',
    'Immortal 1', 'Immortal 2', 'Immortal 3',
    'Radiant'
  ];

  // Try to find current rank
  for (const rank of rankNames.reverse()) {
    const rankIdx = markdown.indexOf(rank);
    if (rankIdx !== -1) {
      stats.current_rank = rank;
      // Look for RR nearby (e.g., "45 RR" or "RR: 45")
      const nearbyText = markdown.substring(rankIdx, rankIdx + 100);
      const rrMatch = nearbyText.match(/(\d+)\s*(?:RR|rr|Rating)/i);
      if (rrMatch) {
        stats.current_rr = parseInt(rrMatch[1]);
      }
      break;
    }
  }

  // Try to find peak rank
  const peakMatch = markdown.match(/(?:peak|highest|best)\s*(?:rank)?[:\s]*((?:Iron|Bronze|Silver|Gold|Platinum|Diamond|Ascendant|Immortal)\s*\d|Radiant)/i);
  if (peakMatch) {
    stats.peak_rank = peakMatch[1].trim();
  }

  // --- Stats extraction using common patterns ---
  // Win Rate
  const winRateMatch = markdown.match(/(?:win\s*(?:rate|%|percentage))[:\s]*([\d.]+)%?/i) ||
                       markdown.match(/([\d.]+)%?\s*(?:win\s*(?:rate|%))/i);
  if (winRateMatch) {
    stats.win_rate = parseFloat(winRateMatch[1]);
  }

  // Wins and Losses
  const winsMatch = markdown.match(/(?:^|\s|[|])(\d+)\s*(?:wins|win(?!\s*rate))/im);
  if (winsMatch) stats.wins = parseInt(winsMatch[1]);
  
  const lossesMatch = markdown.match(/(?:^|\s|[|])(\d+)\s*(?:losses|loss)/im);
  if (lossesMatch) stats.losses = parseInt(lossesMatch[1]);

  // K/D Ratio
  const kdMatch = markdown.match(/(?:k\/d|kd)\s*(?:ratio)?[:\s]*([\d.]+)/i) ||
                  markdown.match(/([\d.]+)\s*(?:k\/d|kd)\s*(?:ratio)?/i);
  if (kdMatch) stats.kd_ratio = parseFloat(kdMatch[1]);

  // KDA Ratio
  const kdaMatch = markdown.match(/(?:kda)\s*(?:ratio)?[:\s]*([\d.]+)/i) ||
                   markdown.match(/([\d.]+)\s*kda/i);
  if (kdaMatch) stats.kda_ratio = parseFloat(kdaMatch[1]);

  // Headshot %
  const hsMatch = markdown.match(/(?:headshot|hs)\s*(?:%|pct|percentage)?[:\s]*([\d.]+)%?/i) ||
                  markdown.match(/([\d.]+)%?\s*(?:headshot|hs)\s*%?/i);
  if (hsMatch) stats.headshot_pct = parseFloat(hsMatch[1]);

  // Damage/Round (ADR)
  const dmgMatch = markdown.match(/(?:damage\s*\/?\s*round|dmg\/rnd|adr|damage per round)[:\s]*([\d.]+)/i) ||
                   markdown.match(/([\d.]+)\s*(?:damage\s*\/?\s*round|dmg\/rnd|adr)/i);
  if (dmgMatch) stats.avg_damage_per_round = parseFloat(dmgMatch[1]);

  // Average Combat Score (ACS)
  const acsMatch = markdown.match(/(?:avg\.?\s*combat\s*score|acs|combat\s*score)[:\s]*([\d.]+)/i) ||
                   markdown.match(/([\d.]+)\s*(?:acs|combat\s*score)/i);
  if (acsMatch) stats.avg_combat_score = parseFloat(acsMatch[1]);

  // Kills/Round
  const kprMatch = markdown.match(/(?:kills?\s*\/?\s*round|kills?\s*per\s*round)[:\s]*([\d.]+)/i);
  if (kprMatch) stats.kills_per_round = parseFloat(kprMatch[1]);

  // First Bloods/Round
  const fbMatch = markdown.match(/(?:first\s*bloods?\s*\/?\s*round|first\s*blood\s*per\s*round|fb\/r)[:\s]*([\d.]+)/i);
  if (fbMatch) stats.first_bloods_per_round = parseFloat(fbMatch[1]);

  // --- Top Agents extraction ---
  // Look for agent names in the context of stats
  const agentNames = [
    'Jett', 'Reyna', 'Raze', 'Phoenix', 'Neon', 'Yoru', 'Iso',
    'Sova', 'Breach', 'Skye', 'Fade', 'Gekko', 'KAY/O',
    'Brimstone', 'Viper', 'Omen', 'Astra', 'Harbor', 'Clove',
    'Sage', 'Cypher', 'Killjoy', 'Chamber', 'Deadlock', 'Vyse', 'Tejo'
  ];

  // Try to find agent mentions with associated stats
  for (const agent of agentNames) {
    const agentIdx = markdown.indexOf(agent);
    if (agentIdx !== -1) {
      // Look at nearby text for stats
      const nearbyText = markdown.substring(Math.max(0, agentIdx - 50), agentIdx + 150);
      const agentEntry: { name: string; games?: number; win_rate?: number; kd?: number } = { name: agent };
      
      const gamesMatch = nearbyText.match(/(\d+)\s*(?:games?|matches?|played)/i);
      if (gamesMatch) agentEntry.games = parseInt(gamesMatch[1]);
      
      const wrMatch = nearbyText.match(/([\d.]+)%?\s*(?:win|wr)/i);
      if (wrMatch) agentEntry.win_rate = parseFloat(wrMatch[1]);
      
      const agentKdMatch = nearbyText.match(/(?:k\/d|kd)[:\s]*([\d.]+)/i);
      if (agentKdMatch) agentEntry.kd = parseFloat(agentKdMatch[1]);
      
      // Only add if we found at least some stats
      if (agentEntry.games || agentEntry.win_rate || agentEntry.kd) {
        stats.top_agents.push(agentEntry);
      }
    }
  }

  // Limit to top 5 agents by games played
  stats.top_agents.sort((a, b) => (b.games || 0) - (a.games || 0));
  stats.top_agents = stats.top_agents.slice(0, 5);

  return stats;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the user's riot_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("riot_id")
      .eq("id", user_id)
      .single();

    if (userError || !userData?.riot_id) {
      return new Response(
        JSON.stringify({ error: "User not found or no Riot ID set. Please set your Riot ID in profile settings first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const riotId = userData.riot_id;
    console.log(`Fetching tracker.gg stats for Riot ID: ${riotId}`);

    // Build tracker.gg URL
    const trackerUrl = buildTrackerUrlSafe(riotId);
    console.log(`Tracker URL: ${trackerUrl}`);

    // Scrape via Firecrawl
    console.log("Calling Firecrawl API...");
    const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: trackerUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 5000, // Wait 5s for JS rendering
      }),
    });

    const firecrawlData = await firecrawlResponse.json();

    if (!firecrawlResponse.ok) {
      console.error("Firecrawl API error:", JSON.stringify(firecrawlData));
      return new Response(
        JSON.stringify({ 
          error: "Failed to scrape tracker.gg. The page may be unavailable or blocked.",
          details: firecrawlData.error || `Status ${firecrawlResponse.status}`
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract markdown from response (handle nested data structure)
    const markdown = firecrawlData?.data?.markdown || firecrawlData?.markdown || "";

    if (!markdown || markdown.length < 100) {
      console.error("Firecrawl returned empty or too-short markdown. Length:", markdown.length);
      return new Response(
        JSON.stringify({ 
          error: "Could not extract meaningful data from tracker.gg. The profile may be private or the page didn't load properly.",
          raw_length: markdown.length
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Firecrawl returned ${markdown.length} chars of markdown`);

    // Check for "Player not found" in the response
    if (markdown.toLowerCase().includes("player not found")) {
      return new Response(
        JSON.stringify({ 
          error: "Player not found on tracker.gg. Please ensure your Riot ID is correct and your profile is public.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the markdown
    const parsedStats = parseTrackerMarkdown(markdown);
    console.log("Parsed stats:", JSON.stringify(parsedStats, null, 2));

    // Upsert into valorant_tracker_stats
    const statsData = {
      user_id,
      current_rank: parsedStats.current_rank,
      current_rr: parsedStats.current_rr,
      peak_rank: parsedStats.peak_rank,
      peak_rank_act: parsedStats.peak_rank_act,
      win_rate: parsedStats.win_rate,
      wins: parsedStats.wins,
      losses: parsedStats.losses,
      kd_ratio: parsedStats.kd_ratio,
      kda_ratio: parsedStats.kda_ratio,
      headshot_pct: parsedStats.headshot_pct,
      avg_damage_per_round: parsedStats.avg_damage_per_round,
      avg_combat_score: parsedStats.avg_combat_score,
      kills_per_round: parsedStats.kills_per_round,
      first_bloods_per_round: parsedStats.first_bloods_per_round,
      top_agents: parsedStats.top_agents,
      top_weapons: parsedStats.top_weapons,
      raw_scrape_data: { markdown_preview: markdown.substring(0, 2000) },
      tracker_url: trackerUrl,
      last_fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: upsertedStats, error: statsError } = await supabase
      .from("valorant_tracker_stats")
      .upsert(statsData, { onConflict: "user_id" })
      .select()
      .single();

    if (statsError) {
      console.error("Error upserting tracker stats:", statsError);
      return new Response(
        JSON.stringify({ error: "Failed to save tracker stats", details: statsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully saved tracker.gg stats for user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: upsertedStats,
        message: `Valorant stats scraped successfully for ${riotId}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fetch-valorant-tracker-stats:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
