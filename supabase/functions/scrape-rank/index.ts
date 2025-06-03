
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { riot_id, user_id } = await req.json();

    if (!riot_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing riot_id or user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Scraping rank for Riot ID: ${riot_id}`);

    // Properly encode the Riot ID for URL
    const encodedRiotId = encodeURIComponent(riot_id);
    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodedRiotId}/overview`;

    console.log(`Original Riot ID: ${riot_id}`);
    console.log(`Encoded for URL: ${encodedRiotId}`);
    console.log(`Full tracker URL: ${trackerUrl}`);

    // More realistic browser headers to avoid detection
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    };

    // Add random delay to appear more human-like
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    const response = await fetch(trackerUrl, { headers });

    if (!response.ok) {
      console.error(`Failed to fetch tracker page: ${response.status} ${response.statusText}`);
      
      if (response.status === 403) {
        throw new Error(`Unable to access tracker.gg profile. This may be due to anti-bot protection or the profile being private. Status: ${response.status}`);
      }
      
      if (response.status === 404) {
        throw new Error(`Riot ID not found on tracker.gg. Please verify the Riot ID is correct: ${riot_id}`);
      }
      
      throw new Error(`Failed to fetch profile data. Status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`HTML content length: ${html.length}`);

    // Enhanced rank extraction with multiple strategies
    const rankNames = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];
    const rankPattern = `(${rankNames.join('|')})\\s*[0-3]?`;

    let currentRank = null;
    let peakRank = null;

    // Strategy 1: Look for "Rating" label with value
    const currentRankPattern1 = new RegExp(`<div[^>]*>\\s*Rating\\s*</div>[\\s\\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>\\s*(${rankPattern})`, 'i');
    let match = html.match(currentRankPattern1);
    if (match) {
      currentRank = match[1].trim();
      console.log(`Found current rank (Strategy 1): ${currentRank}`);
    }

    // Strategy 2: Look for any div with "Rating" followed by rank in value div
    if (!currentRank) {
      const currentRankPattern2 = new RegExp(`Rating[\\s\\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>\\s*(${rankPattern})`, 'i');
      match = html.match(currentRankPattern2);
      if (match) {
        currentRank = match[1].trim();
        console.log(`Found current rank (Strategy 2): ${currentRank}`);
      }
    }

    // Strategy 3: Look for first occurrence of rank in value div (before Peak Rating)
    if (!currentRank) {
      const beforePeakPattern = new RegExp(`<div[^>]*class="[^"]*value[^"]*"[^>]*>\\s*(${rankPattern})[\\s\\S]*?(?=Peak Rating|$)`, 'i');
      match = html.match(beforePeakPattern);
      if (match) {
        currentRank = match[1].trim();
        console.log(`Found current rank (Strategy 3): ${currentRank}`);
      }
    }

    // Peak rank extraction strategies
    // Strategy 1: Look for "Peak Rating" h3 followed by value
    const peakRankPattern1 = new RegExp(`<h3[^>]*>\\s*Peak Rating\\s*</h3>[\\s\\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>\\s*(${rankPattern})`, 'i');
    match = html.match(peakRankPattern1);
    if (match) {
      peakRank = match[1].trim();
      console.log(`Found peak rank (Strategy 1): ${peakRank}`);
    }

    // Strategy 2: Look for "Peak Rating" text followed by rank
    if (!peakRank) {
      const peakRankPattern2 = new RegExp(`Peak Rating[\\s\\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>\\s*(${rankPattern})`, 'i');
      match = html.match(peakRankPattern2);
      if (match) {
        peakRank = match[1].trim();
        console.log(`Found peak rank (Strategy 2): ${peakRank}`);
      }
    }

    // Clean up ranks (remove RR points and extra content)
    if (currentRank) {
      currentRank = currentRank.replace(/\s*<.*$/, '').replace(/\s+/g, ' ').trim();
    }
    if (peakRank) {
      peakRank = peakRank.replace(/\s*<.*$/, '').replace(/\s+/g, ' ').trim();
    }

    console.log(`Final extraction results - Current: ${currentRank}, Peak: ${peakRank}`);

    // Debug: If no ranks found, look for any rank mentions
    if (!currentRank && !peakRank) {
      console.log('No ranks found. Searching for any rank mentions...');
      
      const allRankMatches = [];
      rankNames.forEach(rank => {
        const regex = new RegExp(`${rank}\\s*[0-3]?`, 'gi');
        const matches = html.match(regex);
        if (matches) {
          allRankMatches.push(...matches.slice(0, 3)); // Limit to first 3 matches per rank
        }
      });
      
      if (allRankMatches.length > 0) {
        console.log('Found rank mentions:', allRankMatches);
      }

      // Look for value divs to understand structure
      const valuePattern = /<div[^>]*class="[^"]*value[^"]*"[^>]*>([^<]+)/gi;
      const valueMatches = [];
      let valueMatch;
      while ((valueMatch = valuePattern.exec(html)) !== null && valueMatches.length < 5) {
        valueMatches.push(valueMatch[1].trim());
      }
      if (valueMatches.length > 0) {
        console.log('Found value divs:', valueMatches);
      }
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update user's rank data
    const { error: updateError } = await supabase
      .from('users')
      .update({
        current_rank: currentRank,
        peak_rank: peakRank,
        last_rank_update: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log(`Successfully updated ranks for user ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        current_rank: currentRank, 
        peak_rank: peakRank,
        message: currentRank || peakRank ? 'Rank data extracted successfully' : 'No rank data found on profile'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in scrape-rank function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the edge function logs for more information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
