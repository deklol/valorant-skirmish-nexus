
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RANK_POINT_MAPPING: Record<string, number> = {
  'Iron 1': 25, 'Iron 2': 40, 'Iron 3': 55,
  'Bronze 1': 75, 'Bronze 2': 90, 'Bronze 3': 105,
  'Silver 1': 125, 'Silver 2': 140, 'Silver 3': 155,
  'Gold 1': 180, 'Gold 2': 195, 'Gold 3': 210,
  'Platinum 1': 230, 'Platinum 2': 245, 'Platinum 3': 260,
  'Diamond 1': 285, 'Diamond 2': 300, 'Diamond 3': 315,
  'Ascendant 1': 335, 'Ascendant 2': 350, 'Ascendant 3': 365,
  'Immortal 1': 395, 'Immortal 2': 410, 'Immortal 3': 440,
  'Radiant': 500,
  'Unrated': 150, 'Unranked': 150
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { riot_id, user_id } = await req.json()
    console.log(`Getting rank for Riot ID: ${riot_id}`)

    if (!riot_id || !user_id) {
      throw new Error('Missing riot_id or user_id')
    }

    // Parse the Riot ID
    const [username, tag] = riot_id.split('#')
    if (!username || !tag) {
      throw new Error('Invalid Riot ID format. Expected format: username#tag')
    }

    console.log(`Original Riot ID: ${riot_id}`)
    console.log(`Username: ${username}, Tag: ${tag}`)

    // Encode username for URL
    const encodedUsername = encodeURIComponent(username)
    const apiUrl = `https://vaccie.pythonanywhere.com/mmr/${encodedUsername}/${tag}/eu`
    
    console.log(`Vaccie API URL: ${apiUrl}`)

    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const rankData = await response.text()
    console.log(`Vaccie API response: ${rankData}`)

    // Parse the rank from the response
    let currentRank = 'Unrated'
    let rr = 0

    // Extract rank and RR from the response string
    const rankMatch = rankData.match(/(Iron|Bronze|Silver|Gold|Platinum|Diamond|Ascendant|Immortal|Radiant)(?:\s+(\d+))/)
    const rrMatch = rankData.match(/RR:\s*(\d+)/)
    const unratedMatch = rankData.match(/\b(?:Unrated|Unranked)\b/i)

    if (unratedMatch) {
      currentRank = 'Unrated'
      rr = 0
    } else if (rankMatch) {
      const [_, rankTier, rankLevel] = rankMatch
      if (rankTier === 'Radiant') {
        currentRank = 'Radiant'
      } else if (rankLevel) {
        currentRank = `${rankTier} ${rankLevel}`
      } else {
        currentRank = rankTier
      }
      
      if (rrMatch) {
        rr = parseInt(rrMatch[1])
      }
    }

    console.log(`Parsed rank: ${currentRank}, RR: ${rr}`)

    // Calculate weight rating
    const weightRating = RANK_POINT_MAPPING[currentRank] || 150
    console.log(`Calculated weight_rating: ${weightRating} for rank: ${currentRank}`)

    // Get current user data to check peak rank
    const { data: currentUser } = await supabaseClient
      .from('users')
      .select('current_rank, peak_rank')
      .eq('id', user_id)
      .single()

    // Update user with new rank data and potentially peak rank
    const updateData: any = {
      current_rank: currentRank,
      weight_rating: weightRating,
      last_rank_update: new Date().toISOString()
    }

    // Update peak rank if this rank is higher than current peak
    const newRankPoints = RANK_POINT_MAPPING[currentRank] || 150
    const currentPeakPoints = currentUser?.peak_rank ? (RANK_POINT_MAPPING[currentUser.peak_rank] || 150) : 0

    let peakRankUpdated = false
    if (currentRank !== 'Unrated' && currentRank !== 'Unranked' && newRankPoints > currentPeakPoints) {
      updateData.peak_rank = currentRank
      peakRankUpdated = true
      console.log(`Peak rank updated to: ${currentRank}`)
    }

    const { error: updateError } = await supabaseClient
      .from('users')
      .update(updateData)
      .eq('id', user_id)

    if (updateError) {
      throw updateError
    }

    console.log(`Successfully updated rank for user ${user_id}: rank=${currentRank}, weight_rating=${weightRating}, rr=${rr}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        current_rank: currentRank, 
        weight_rating: weightRating, 
        rr: rr,
        peak_rank_updated: peakRankUpdated
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in scrape-rank function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
