import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tournamentId } = await req.json();
    
    if (!tournamentId) {
      return new Response(JSON.stringify({ error: "Tournament ID required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tournament data
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return new Response(JSON.stringify({ error: "Tournament not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all matches with teams
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name),
        winner:teams!matches_winner_id_fkey(id, name)
      `)
      .eq('tournament_id', tournamentId)
      .order('round_number')
      .order('match_number');

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return new Response(JSON.stringify({ error: "Failed to fetch matches" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
    }

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a tournament bracket health analyzer. Analyze the provided tournament data and identify any issues.

Focus on detecting:
1. **Duplicate Match Positions**: Same round_number + match_number appearing multiple times
2. **Team Assignment Conflicts**: Same team assigned to multiple matches in the same round
3. **Orphaned Matches**: Matches with missing team assignments in early rounds
4. **Bracket Structure Issues**: Incorrect number of matches per round for single elimination
5. **Invalid Winner References**: Winner_id pointing to teams not in the match

Return a JSON object with this structure:
{
  "health_score": 0-100,
  "status": "healthy" | "warning" | "critical",
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "type": "duplicate_match" | "team_conflict" | "orphaned_match" | "structure_issue" | "invalid_winner",
      "message": "Clear description of the issue",
      "affected_matches": ["match_id1", "match_id2"],
      "suggested_fix": "Actionable fix suggestion"
    }
  ],
  "summary": "Brief overall assessment"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze this tournament bracket data:

Tournament: ${tournament.name} (Status: ${tournament.status})
Team Count: ${teams?.length || 0}
Match Count: ${matches?.length || 0}

Matches Data:
${JSON.stringify(matches, null, 2)}

Teams Data:
${JSON.stringify(teams, null, 2)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      console.error('Failed to parse AI response:', analysisText);
      analysis = {
        health_score: 50,
        status: "warning",
        issues: [{
          severity: "warning",
          type: "structure_issue",
          message: "AI analysis returned invalid format",
          affected_matches: [],
          suggested_fix: "Manual review recommended"
        }],
        summary: "Analysis format error"
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-health-check:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
