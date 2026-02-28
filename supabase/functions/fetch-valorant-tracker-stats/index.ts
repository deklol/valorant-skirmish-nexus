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
  tracker_score: number | null;
  tracker_score_max: number | null;
  top_agents: Array<{ name: string; games?: number; win_rate?: number; kd?: number }>;
  top_weapons: Array<{ name: string; headshot_pct?: number; kills?: number }>;
}

/**
 * Constructs the tracker.gg URL from a Riot ID.
 * 
 * Riot ID format: "Name#Tag" (e.g. "dEkjeツ#lol")
 * Tracker.gg URL format: name is URI-encoded (unicode → %XX), # becomes %23, tag is URI-encoded
 * 
 * Example: "dEkjeツ#lol" → "dEkje%E3%83%84%23lol"
 * Result: https://tracker.gg/valorant/profile/riot/dEkje%E3%83%84%23lol/overview?platform=pc&playlist=competitive
 */
function buildTrackerUrl(riotId: string): string {
  // Split on the LAST # in case the name itself contains special chars
  const hashIndex = riotId.lastIndexOf('#');
  if (hashIndex === -1 || hashIndex === 0 || hashIndex === riotId.length - 1) {
    throw new Error(`Invalid Riot ID format: "${riotId}". Expected "Name#Tag"`);
  }
  const name = riotId.substring(0, hashIndex);
  const tag = riotId.substring(hashIndex + 1);

  // encodeURIComponent handles unicode (ツ → %E3%83%84) and special chars
  const encodedName = encodeURIComponent(name);
  const encodedTag = encodeURIComponent(tag);
  
  return `https://tracker.gg/valorant/profile/riot/${encodedName}%23${encodedTag}/overview?platform=pc&playlist=competitive`;
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
    tracker_score: null,
    tracker_score_max: null,
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

  // --- Current Rank ---
  // tracker.gg shows "Rating" label then the rank on next line.
  // Check for Unranked/Unrated first (appears as "Rating\n\nUnranked")
  const unrankedMatch = markdown.match(/Rating\s*\n\s*(Unranked|Unrated)/i);
  if (unrankedMatch) {
    stats.current_rank = unrankedMatch[1];
  } else {
    // Look for a rank name appearing right after "Rating" label
    for (const rank of [...rankNames].reverse()) {
      // Match "Rating" followed by the rank within ~100 chars (covers newlines, images, etc.)
      const rankRegex = new RegExp(`Rating[\\s\\S]{0,100}?${rank.replace(/\s/g, '\\s*')}`, 'i');
      const currentMatch = markdown.match(rankRegex);
      if (currentMatch) {
        stats.current_rank = rank;
        const matchIdx = currentMatch.index || 0;
        const nearbyText = markdown.substring(matchIdx, matchIdx + 200);
        const rrMatch = nearbyText.match(/(\d+)\s*(?:RR|rr)/i);
        if (rrMatch) {
          stats.current_rr = parseInt(rrMatch[1]);
        }
        break;
      }
    }
  }

  // --- Peak Rank ---
  // Markdown shows "### Peak Rating" or "Peak Rating" then rank on next lines
  // e.g. "### Peak Rating\n\n![...]\n\nImmortal 2 180RR\n\nEPISODE 5: ACT III"
  const peakSectionMatch = markdown.match(/Peak\s*Rating[\s\S]{0,300}/i);
  if (peakSectionMatch) {
    const peakSection = peakSectionMatch[0];
    for (const rank of [...rankNames].reverse()) {
      const rankIdx = peakSection.indexOf(rank);
      if (rankIdx !== -1) {
        // Found the rank in peak section
        const afterRank = peakSection.substring(rankIdx);
        // Extract RR - may be "180RR" (no space) or "180 RR"
        const peakRrMatch = afterRank.match(/(\d+)\s*RR/i);
        if (peakRrMatch) {
          const peakRr = parseInt(peakRrMatch[1]);
          stats.peak_rank = `${rank} ${peakRr} RR`;
        } else {
          stats.peak_rank = rank;
        }
        // Extract act/episode info (e.g. "EPISODE 5: ACT III")
        const actMatch = peakSection.match(/(EPISODE\s*\d+\s*:\s*ACT\s*(?:I{1,3}|IV|V|\d+))/i);
        if (actMatch) {
          stats.peak_rank_act = actMatch[1];
        }
        break;
      }
    }
  }
  // Fallback peak detection
  if (!stats.peak_rank) {
    const peakMatch = markdown.match(/(?:peak|highest|best)\s*(?:rank|rating)?[:\s]*((?:Iron|Bronze|Silver|Gold|Platinum|Diamond|Ascendant|Immortal)\s*\d|Radiant)/i);
    if (peakMatch) {
      stats.peak_rank = peakMatch[1].trim();
    }
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

  // --- Tracker Score (TRN Rating) ---
  // Patterns: "Tracker Score 750", "TRN Rating 850", "750/1,000", "850 / 1000"
  const trnMatch = markdown.match(/(?:tracker\s*score|trn\s*(?:rating|score))[:\s]*([\d,]+)/i);
  if (trnMatch) {
    stats.tracker_score = parseInt(trnMatch[1].replace(/,/g, ''));
    stats.tracker_score_max = 1000; // tracker.gg score is always out of 1000
  }
  // Also try "XXX/1,000" or "XXX / 1000" pattern
  if (!stats.tracker_score) {
    const scoreSlashMatch = markdown.match(/([\d,]+)\s*\/\s*1[,.]?000/);
    if (scoreSlashMatch) {
      stats.tracker_score = parseInt(scoreSlashMatch[1].replace(/,/g, ''));
      stats.tracker_score_max = 1000;
    }
  }

  // --- Top Agents extraction ---
  // Complete list of all Valorant agents
  const agentNames = [
    'Astra', 'Breach', 'Brimstone', 'Chamber', 'Clove', 'Cypher', 'Deadlock',
    'Fade', 'Gekko', 'Harbor', 'Iso', 'Jett', 'KAY/O', 'Killjoy', 'Neon',
    'Omen', 'Phoenix', 'Raze', 'Reyna', 'Sage', 'Skye', 'Sova', 'Tejo',
    'Veto', 'Viper', 'Vyse', 'Waylay', 'Yoru'
  ];

  // First, try to isolate the "Top Agents" section from the markdown
  // tracker.gg typically has a section header like "Top Agents" or "Most Played Agents"
  const agentSectionRegex = /(?:top\s*agents?|most\s*played\s*agents?|agents?\s*overview)/i;
  const agentSectionMatch = agentSectionRegex.exec(markdown);
  
  // Use the agents section if found, otherwise fall back to full markdown
  // Take a generous chunk after the section header (tracker shows 3 agents with stats)
  let agentSearchText = markdown;
  if (agentSectionMatch) {
    const sectionStart = agentSectionMatch.index;
    // Take ~2000 chars after the header — enough for 3 agent entries but not the whole page
    agentSearchText = markdown.substring(sectionStart, sectionStart + 2000);
    console.log('Found Top Agents section at index:', sectionStart);
  } else {
    console.log('No Top Agents section header found, searching full markdown');
  }

  // Parse agents from the isolated section
  for (const agent of agentNames) {
    // Use word-boundary-aware matching
    const escapedName = agent.replace('/', '\\/');
    const agentRegex = new RegExp(`(?:^|[\\s|#*\\[\\(])${escapedName}(?:[\\s|\\]\\),.:;*#]|$)`, 'gi');
    
    let match: RegExpExecArray | null;
    while ((match = agentRegex.exec(agentSearchText)) !== null) {
      const agentIdx = match.index;
      // Look at nearby text for stats
      const nearbyText = agentSearchText.substring(Math.max(0, agentIdx - 100), agentIdx + 250);
      const entry: { name: string; games?: number; win_rate?: number; kd?: number } = { name: agent };

      // Match patterns like "50.8% Win" or "Win 50.8%" or "50.8% WR" or "Win Rate 50.8%"
      const wrMatch = nearbyText.match(/([\d.]+)%\s*(?:win|wr)/i) || 
                       nearbyText.match(/(?:win\s*(?:rate|%|pct)?)[:\s]*([\d.]+)%?/i);
      if (wrMatch) entry.win_rate = parseFloat(wrMatch[1]);

      const gamesMatch = nearbyText.match(/(\d+)\s*(?:games?|matches?|played|rounds?)/i);
      if (gamesMatch) entry.games = parseInt(gamesMatch[1]);

      const agentKdMatch = nearbyText.match(/(?:k\/d|kd|k\.d)[:\s]*([\d.]+)/i);
      if (agentKdMatch) entry.kd = parseFloat(agentKdMatch[1]);

      // Only add if we found at least win_rate (tracker.gg always shows WR for top agents)
      if (entry.win_rate !== undefined) {
        stats.top_agents.push(entry);
        break; // Only take the first good match per agent in the section
      }
    }
  }

  // Limit to top 3 agents (tracker.gg shows exactly 3)
  // Sort by games played if available, otherwise keep order found
  if (stats.top_agents.some(a => a.games)) {
    stats.top_agents.sort((a, b) => (b.games || 0) - (a.games || 0));
  }
  stats.top_agents = stats.top_agents.slice(0, 3);

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
    const trackerUrl = buildTrackerUrl(riotId);
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
      tracker_score: parsedStats.tracker_score,
      tracker_score_max: parsedStats.tracker_score_max,
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
