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
    const { playerData, calculatedWeight, atlasData } = await req.json();

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

    // Construct AI prompt for ATLAS-based confidence analysis
    const prompt = `You are an expert tournament balancing analyst using the ATLAS evidence-based weight system. Analyze the following player's calculated weight and determine confidence in its accuracy for fair team balancing.

Player: ${playerData.discord_username || 'Unknown'}
Calculated Weight: ${calculatedWeight} points
Current Rank: ${playerData.current_rank || 'Unranked'}
Peak Rank: ${playerData.peak_rank || 'None'}

${atlasData ? `
ATLAS Evidence-Based Weight Calculation:
- Base Points (from rank): ${atlasData.basePoints} pts
- Tournament Performance Bonus: +${atlasData.tournamentBonus} pts (${atlasData.tournamentsWon} wins in ${atlasData.tournamentsPlayed} tournaments)
- Win Rate: ${atlasData.winRate}%
- Underranked Bonus: +${atlasData.underrankedBonus} pts
- Weight Source: ${atlasData.weightSource}
- Is Elite Tier: ${atlasData.isElite ? 'Yes (400+ pts)' : 'No'}
- Evidence Factors: ${atlasData.evidenceFactors.join(', ') || 'None'}
- ATLAS Reasoning: "${atlasData.reasoning}"
- Mini-AI Analysis: ${atlasData.miniAiAnalysis}
` : `
Basic Data (ATLAS Not Available):
- Tournaments: ${playerData.tournaments_played || 0} played, ${playerData.tournaments_won || 0} won
- Manual Override: ${playerData.use_manual_override ? 'Yes' : 'No'}
- Weight Source: ${playerData.weightSource || 'unknown'}
`}

**Focus on Weight Accuracy, NOT Data Completeness:**

Analyze whether the calculated weight (${calculatedWeight} pts) will create fair, balanced teams:

1. **Weight-Performance Alignment**: Does tournament win rate (${atlasData?.winRate || 0}%) justify this weight?
2. **Rank Consistency**: Is ${calculatedWeight} pts appropriate for ${playerData.current_rank || 'Unranked'} rank?
3. **Red Flags to Detect**:
   - Smurfing: Low rank but high win rate (e.g., Gold rank with 80%+ win rate)
   - Rank Decay: High peak rank (Immortal/Radiant) but long time inactive or poor recent performance
   - Weight Inflation: Overweight relative to actual skill (might dominate opponents unfairly)
   - Weight Deflation: Underweight relative to actual skill (could be unfair to their team)

Return ONLY a JSON object (no markdown):
{
  "confidence": <0.0-1.0>,
  "reasoning": "<Why this weight is accurate/inaccurate for team balancing>",
  "flags": ["<actionable warnings: 'possible_smurf', 'rank_decay', 'weight_inflated', 'weight_deflated', 'insufficient_data'>"]
}

**Confidence Scale:**
- 0.85-1.0: Weight strongly validated by performance data (creates fair matches)
- 0.6-0.84: Weight reasonable with minor concerns (acceptable for balancing)  
- 0.0-0.59: Weight questionable (may cause unfair team compositions)

Be generous with confidence when ATLAS data supports the weight. Low confidence should indicate balancing concerns, not missing data.`;

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
