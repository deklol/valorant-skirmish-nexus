
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

    // Format the Riot ID for URL (encode # as %2523)
    const encodedRiotId = riot_id.replace('#', '%2523');
    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodedRiotId}/`;

    console.log(`Fetching from URL: ${trackerUrl}`);

    // Fetch the tracker.gg page
    const response = await fetch(trackerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tracker page: ${response.status}`);
    }

    const html = await response.text();
    console.log(`HTML length: ${html.length}`);

    // Extract current rank
    let currentRank = null;
    const currentRankMatch = html.match(/<div[^>]*class="[^"]*rating-entry__rank-info[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>([^<]+)/);
    if (currentRankMatch) {
      currentRank = currentRankMatch[1].trim();
      console.log(`Found current rank: ${currentRank}`);
    }

    // Extract peak rank
    let peakRank = null;
    const peakRankMatch = html.match(/<h3[^>]*>Peak Rating<\/h3>[\s\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>([^<]+)/);
    if (peakRankMatch) {
      peakRank = peakRankMatch[1].trim();
      console.log(`Found peak rank: ${peakRank}`);
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
