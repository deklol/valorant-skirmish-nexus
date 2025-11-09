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
    const { messages, tournamentId } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context from tournament data if provided
    let contextData = "";
    if (tournamentId) {
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      
      const { data: matches } = await supabase
        .from('matches')
        .select('*, team1:teams!matches_team1_id_fkey(name), team2:teams!matches_team2_id_fkey(name)')
        .eq('tournament_id', tournamentId)
        .limit(20);
      
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (tournament) {
        contextData = `\n\nCurrent Tournament Context:
- Name: ${tournament.name}
- Status: ${tournament.status}
- Teams: ${teams?.length || 0}
- Matches: ${matches?.length || 0}
- Format: ${tournament.match_format} (${tournament.team_size}v${tournament.team_size})`;
      }
    }

    // Fetch recent audit logs for context
    const { data: auditLogs } = await supabase
      .from('audit_log')
      .select('action, details, timestamp')
      .order('timestamp', { ascending: false })
      .limit(10);

    const auditContext = auditLogs?.length 
      ? `\n\nRecent System Activity:\n${auditLogs.map(log => `- ${log.action}: ${log.details}`).join('\n')}`
      : '';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert tournament management assistant for a competitive gaming platform. Your role is to help administrators troubleshoot issues, understand bracket structures, and provide actionable solutions.

Key capabilities:
- Diagnose tournament bracket issues (duplicate matches, team conflicts, orphaned matches)
- Explain match progression and winner advancement logic
- Guide admins through common fixes (regenerating brackets, manual match editing)
- Interpret audit logs and system events
- Recommend best practices for tournament management

Guidelines:
- Always prioritize data integrity and player experience
- Suggest manual verification for critical changes
- Explain technical concepts in admin-friendly language
- Provide step-by-step fix instructions when possible
- Ask clarifying questions if the issue is ambiguous
${contextData}${auditContext}

If asked about the app's data, you can query the database to provide accurate information.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stream the response back to client
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in ai-chat:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
