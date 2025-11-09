import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerData, calculatedWeight } = await req.json();

    if (!playerData || typeof calculatedWeight !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: playerData, calculatedWeight' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Construct AI prompt for confidence analysis
    const prompt = `You are an expert tournament balancing analyst. Analyze the following player data and determine how confident you are in the calculated weight.

Player Data:
- Username: ${playerData.discord_username || 'Unknown'}
- Current Rank: ${playerData.current_rank || 'Unranked'}
- Peak Rank: ${playerData.peak_rank || 'None'}
- Calculated Weight: ${calculatedWeight} points
- Weight Source: ${playerData.weightSource || 'unknown'}
- Tournaments Won: ${playerData.tournaments_won || 0}
- Tournaments Played: ${playerData.tournaments_played || 0}
- Last Rank Update: ${playerData.last_rank_update || 'Unknown'}
- Manual Override: ${playerData.use_manual_override ? 'Yes' : 'No'}

Factors to consider:
1. Data Consistency: Are current rank, peak rank, and weight logically aligned?
2. Data Recency: Is the rank information recent or stale?
3. Tournament History: Does tournament performance support the calculated weight?
4. Data Completeness: Is important data missing?

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "confidence": <number between 0 and 1>,
  "reasoning": "<1-2 sentence explanation>",
  "flags": ["<optional warnings>"]
}

Examples:
- High confidence (0.85-1.0): Recent rank data, consistent tournament performance, no missing data
- Medium confidence (0.6-0.84): Some data staleness or minor inconsistencies
- Low confidence (<0.6): Missing data, major inconsistencies, or significant staleness`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Low temperature for consistent, factual analysis
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      
      // Return fallback confidence
      return new Response(
        JSON.stringify({
          confidence: 0.75,
          reasoning: 'AI analysis unavailable, using default confidence',
          flags: ['ai_unavailable']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response (handle potential markdown wrapping)
    let analysisResult;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : aiResponse;
      analysisResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      
      // Fallback: extract confidence from text if JSON parsing fails
      const confidenceMatch = aiResponse.match(/confidence["\s:]+([0-9.]+)/i);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.75;
      
      analysisResult = {
        confidence: Math.min(Math.max(confidence, 0), 1),
        reasoning: 'AI analysis completed with fallback parsing',
        flags: ['fallback_parsing']
      };
    }

    // Validate and normalize confidence
    if (typeof analysisResult.confidence !== 'number' || 
        analysisResult.confidence < 0 || 
        analysisResult.confidence > 1) {
      analysisResult.confidence = 0.75;
      analysisResult.flags = [...(analysisResult.flags || []), 'invalid_confidence_normalized'];
    }

    console.log(`AI Confidence for ${playerData.discord_username}: ${analysisResult.confidence} - ${analysisResult.reasoning}`);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-weight-confidence function:', error);
    
    // Return safe fallback instead of error
    return new Response(
      JSON.stringify({
        confidence: 0.75,
        reasoning: 'AI analysis failed, using default confidence',
        flags: ['error_fallback'],
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
