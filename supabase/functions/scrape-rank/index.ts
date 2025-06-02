
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
      console.error('Missing required parameters:', { riot_id: !!riot_id, user_id: !!user_id });
      return new Response(
        JSON.stringify({ error: 'Missing riot_id or user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Starting rank scrape for Riot ID: ${riot_id}, User ID: ${user_id}`);

    // Properly encode the Riot ID for URL - handle Unicode characters and # symbol
    // First encode the entire string to handle Unicode characters like ツ
    const fullyEncodedRiotId = encodeURIComponent(riot_id);
    // Then replace the encoded # (%23) with %2523 as tracker.gg expects
    const trackerEncodedRiotId = fullyEncodedRiotId.replace(/%23/g, '%2523');
    
    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${trackerEncodedRiotId}/overview`;

    console.log(`Fetching from URL: ${trackerUrl}`);
    console.log(`Original Riot ID: ${riot_id} -> Encoded: ${trackerEncodedRiotId}`);

    // Fetch the tracker.gg page with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(trackerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`HTTP Error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch tracker page: ${response.status}`);
      }

      const html = await response.text();
      console.log(`HTML fetched successfully, length: ${html.length}`);

      // Extract current rank - improved regex to handle variations
      let currentRank = null;
      const currentRankPatterns = [
        /<div[^>]*class="[^"]*rating-entry__rank-info[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>([^<]+)/,
        /<div[^>]*class="[^"]*value[^"]*"[^>]*>([^<]+)[\s\S]*?<div[^>]*class="[^"]*subtext[^"]*"[^>]*>/
      ];

      for (const pattern of currentRankPatterns) {
        const match = html.match(pattern);
        if (match) {
          currentRank = match[1].trim();
          console.log(`Found current rank with pattern: ${currentRank}`);
          break;
        }
      }

      // Extract peak rank - improved regex
      let peakRank = null;
      const peakRankPatterns = [
        /<h3[^>]*>Peak Rating<\/h3>[\s\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>([^<]+)/,
        /Peak Rating[\s\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>([^<]+)/
      ];

      for (const pattern of peakRankPatterns) {
        const match = html.match(pattern);
        if (match) {
          peakRank = match[1].trim();
          console.log(`Found peak rank with pattern: ${peakRank}`);
          break;
        }
      }

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      console.log(`Updating database for user ${user_id} with ranks:`, { currentRank, peakRank });

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
          message: `Found ${currentRank ? 'current rank' : 'no current rank'} and ${peakRank ? 'peak rank' : 'no peak rank'}`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Request timed out');
        throw new Error('Request timed out - tracker.gg may be slow');
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in scrape-rank function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
