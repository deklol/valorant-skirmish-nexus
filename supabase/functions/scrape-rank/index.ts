
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

    // Format the Riot ID for tracker.gg URL - only replace # with %23
    const formattedRiotId = riot_id.replace('#', '%23');
    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${formattedRiotId}/overview`;

    console.log(`Original Riot ID: ${riot_id}`);
    console.log(`Formatted for URL: ${formattedRiotId}`);
    console.log(`Full tracker URL: ${trackerUrl}`);

    // Fetch the tracker.gg page with more realistic headers to avoid blocking
    const response = await fetch(trackerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch tracker page: ${response.status} ${response.statusText}`);
      
      // If we get a 403, it might be anti-bot protection
      if (response.status === 403) {
        throw new Error(`Tracker.gg is blocking our requests. This is likely anti-bot protection. Please try again later or contact support.`);
      }
      
      throw new Error(`Failed to fetch tracker page: ${response.status}`);
    }

    const html = await response.text();
    console.log(`HTML length: ${html.length}`);

    // Define rank names for matching
    const rankNames = [
      'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'
    ];
    const rankPattern = `(${rankNames.join('|')})\\s*[0-3]?`;

    // Extract current rank - look for "Rating" label followed by a rank value
    let currentRank = null;
    
    // Pattern 1: Look for "Rating" label followed by value div
    const currentRankRegex = new RegExp(`<div[^>]*>\\s*Rating\\s*</div>[\\s\\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>\\s*(${rankPattern})[\\s\\S]*?</div>`, 'i');
    const currentRankMatch = html.match(currentRankRegex);
    
    if (currentRankMatch) {
      currentRank = currentRankMatch[1].trim();
      console.log(`Found current rank: ${currentRank}`);
    } else {
      console.log('Current rank not found with Rating label, trying alternative patterns...');
      
      // Pattern 2: Look for any value div that contains a rank name (but not after "Peak Rating")
      const altCurrentRankRegex = new RegExp(`<div[^>]*class="[^"]*value[^"]*"[^>]*>\\s*(${rankPattern})[\\s\\S]*?</div>(?![\\s\\S]*?Peak Rating)`, 'i');
      const altCurrentRankMatch = html.match(altCurrentRankRegex);
      
      if (altCurrentRankMatch) {
        currentRank = altCurrentRankMatch[1].trim();
        console.log(`Found current rank with alternative pattern: ${currentRank}`);
      }
    }

    // Extract peak rank - look for "Peak Rating" header followed by a rank value
    let peakRank = null;
    
    // Pattern 1: Look for "Peak Rating" h3 followed by value div
    const peakRankRegex = new RegExp(`<h3[^>]*>\\s*Peak Rating\\s*</h3>[\\s\\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>\\s*(${rankPattern})[\\s\\S]*?</div>`, 'i');
    const peakRankMatch = html.match(peakRankRegex);
    
    if (peakRankMatch) {
      peakRank = peakRankMatch[1].trim();
      console.log(`Found peak rank: ${peakRank}`);
    } else {
      console.log('Peak rank not found with h3, trying alternative patterns...');
      
      // Pattern 2: Look for "Peak Rating" in any element followed by value div
      const altPeakRankRegex = new RegExp(`Peak Rating[\\s\\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>\\s*(${rankPattern})[\\s\\S]*?</div>`, 'i');
      const altPeakRankMatch = html.match(altPeakRankRegex);
      
      if (altPeakRankMatch) {
        peakRank = altPeakRankMatch[1].trim();
        console.log(`Found peak rank with alternative pattern: ${peakRank}`);
      }
    }

    // Clean up the extracted ranks (remove extra whitespace and RR points)
    if (currentRank) {
      currentRank = currentRank.replace(/\s+/g, ' ').split('<')[0].trim();
    }
    if (peakRank) {
      peakRank = peakRank.replace(/\s+/g, ' ').split('<')[0].trim();
    }

    // Log what we found for debugging
    console.log(`Extraction results - Current: ${currentRank}, Peak: ${peakRank}`);
    
    // If we didn't find either rank, log some HTML snippets for debugging
    if (!currentRank && !peakRank) {
      console.log('No ranks found. Looking for rating-related content...');
      
      // Look for any mentions of rank names in the HTML
      const rankMentions = [];
      rankNames.forEach(rank => {
        const rankRegex = new RegExp(`${rank}\\s*[0-3]?`, 'gi');
        const matches = html.match(rankRegex);
        if (matches) {
          rankMentions.push(...matches);
        }
      });
      
      if (rankMentions.length > 0) {
        console.log('Found rank mentions:', rankMentions.slice(0, 5));
      }
      
      // Look for value divs
      const valueMatches = html.match(/<div[^>]*class="[^"]*value[^"]*"[^>]*>[^<]*</gi);
      if (valueMatches) {
        console.log('Found value divs:', valueMatches.slice(0, 3));
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
        peak_rank: peakRank 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in scrape-rank function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
