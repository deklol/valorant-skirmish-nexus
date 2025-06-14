
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// TGH Skirmish Rank-to-Point System for weight_rating
const RANK_WEIGHT_MAPPING: Record<string, number> = {
  // Iron
  'Iron 1': 10,
  'Iron 2': 15,
  'Iron 3': 20,
  
  // Bronze
  'Bronze 1': 25,
  'Bronze 2': 30,
  'Bronze 3': 35,
  
  // Silver
  'Silver 1': 40,
  'Silver 2': 50,
  'Silver 3': 60,
  
  // Gold
  'Gold 1': 70,
  'Gold 2': 80,
  'Gold 3': 90,
  
  // Platinum
  'Platinum 1': 100,
  'Platinum 2': 115,
  'Platinum 3': 130,
  
  // Diamond
  'Diamond 1': 150,
  'Diamond 2': 170,
  'Diamond 3': 190,
  
  // Ascendant
  'Ascendant 1': 215,
  'Ascendant 2': 240,
  'Ascendant 3': 265,
  
  // Immortal
  'Immortal 1': 300,
  'Immortal 2': 350,
  'Immortal 3': 400,
  
  // Radiant
  'Radiant': 500,
  
  // Default/Unknown
  'Unranked': 150,
  'Phantom': 150
};

const getWeightRating = (rank: string): number => {
  return RANK_WEIGHT_MAPPING[rank] || 150;
};

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

    console.log(`Getting rank for Riot ID: ${riot_id}`);

    // Parse Riot ID (format: username#tag)
    const riotIdParts = riot_id.split('#');
    if (riotIdParts.length !== 2) {
      return new Response(
        JSON.stringify({ error: 'Invalid Riot ID format. Expected format: username#tag' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const [username, tag] = riotIdParts;
    
    // URL encode the username and tag
    const encodedUsername = encodeURIComponent(username);
    const encodedTag = encodeURIComponent(tag);
    
    // Build Vaccie API URL (defaulting to EU region)
    const vaccieUrl = `https://vaccie.pythonanywhere.com/mmr/${encodedUsername}/${encodedTag}/eu`;
    
    console.log(`Original Riot ID: ${riot_id}`);
    console.log(`Username: ${username}, Tag: ${tag}`);
    console.log(`Vaccie API URL: ${vaccieUrl}`);

    // Call Vaccie API
    const response = await fetch(vaccieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Vaccie API failed: ${response.status} ${response.statusText}`);
      
      if (response.status === 404) {
        throw new Error(`Player not found. Please verify the Riot ID is correct: ${riot_id}`);
      }
      
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Please try again later.`);
      }
      
      throw new Error(`Failed to fetch rank data. Status: ${response.status}`);
    }

    const rankText = await response.text();
    console.log(`Vaccie API response: ${rankText}`);

    // Parse the response (format: "Immortal 1, RR: 10 (18) (🛡️ 2)")
    let currentRank = null;
    let rankPoints = null;

    if (rankText && rankText.trim() !== '') {
      // Extract rank (everything before the first comma or "RR:")
      const rankMatch = rankText.match(/^([^,]+?)(?:,|\s*RR:|$)/);
      if (rankMatch) {
        currentRank = rankMatch[1].trim();
      }

      // Extract RR points if available
      const rrMatch = rankText.match(/RR:\s*(\d+)/);
      if (rrMatch) {
        rankPoints = parseInt(rrMatch[1]);
      }
    }

    console.log(`Parsed rank: ${currentRank}, RR: ${rankPoints}`);

    // Calculate weight_rating based on rank
    const weightRating = currentRank ? getWeightRating(currentRank) : 150;
    console.log(`Calculated weight_rating: ${weightRating} for rank: ${currentRank}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update user's rank data including weight_rating
    const updateData: any = {
      last_rank_update: new Date().toISOString(),
      weight_rating: weightRating
    };

    if (currentRank) {
      updateData.current_rank = currentRank;
    }

    if (rankPoints !== null) {
      updateData.rank_points = rankPoints;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log(`Successfully updated rank for user ${user_id}: rank=${currentRank}, weight_rating=${weightRating}, rr=${rankPoints}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        current_rank: currentRank, 
        rank_points: rankPoints,
        weight_rating: weightRating,
        raw_response: rankText,
        message: currentRank ? 'Rank data retrieved successfully' : 'No rank data found'
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
