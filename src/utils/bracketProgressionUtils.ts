
import { supabase } from "@/integrations/supabase/client";

export interface BracketProgressionDiagnostic {
  tournamentId: string;
  issues: string[];
  suggestions: string[];
  nextActions: string[];
}

export async function diagnoseBracketProgression(tournamentId: string): Promise<BracketProgressionDiagnostic> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const nextActions: string[] = [];

  try {
    // Get all matches for the tournament
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });

    if (matchesError || !matches) {
      issues.push('Failed to fetch tournament matches');
      return { tournamentId, issues, suggestions, nextActions };
    }

    // Analyze completed matches without progression
    const completedMatches = matches.filter(m => m.status === 'completed' && m.winner_id);
    const maxRound = Math.max(...matches.map(m => m.round_number));

    for (const match of completedMatches) {
      if (match.round_number < maxRound) {
        // Check if winner was advanced to next round
        const nextRound = match.round_number + 1;
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        
        const nextMatch = matches.find(m => 
          m.round_number === nextRound && m.match_number === nextMatchNumber
        );

        if (nextMatch) {
          const isOdd = match.match_number % 2 === 1;
          const expectedSlot = isOdd ? nextMatch.team1_id : nextMatch.team2_id;
          
          if (expectedSlot !== match.winner_id) {
            issues.push(`Match ${match.id} winner not advanced to next round`);
            suggestions.push(`Advance team ${match.winner_id} to round ${nextRound} match ${nextMatchNumber}`);
            nextActions.push(`UPDATE matches SET ${isOdd ? 'team1_id' : 'team2_id'} = '${match.winner_id}' WHERE id = '${nextMatch.id}'`);
          }
        }
      }
    }

    // Check for matches that should be live but aren't
    const matchesThatShouldBeLive = matches.filter(m => 
      m.status === 'pending' && m.team1_id && m.team2_id
    );

    for (const match of matchesThatShouldBeLive) {
      issues.push(`Match ${match.id} has both teams but is still pending`);
      suggestions.push(`Set match ${match.id} to live status`);
      nextActions.push(`UPDATE matches SET status = 'live' WHERE id = '${match.id}'`);
    }

    // Check for veto sessions that are complete but match isn't progressing
    const { data: vetoSessions } = await supabase
      .from('map_veto_sessions')
      .select(`
        *,
        match:match_id (
          id, status, winner_id, score_team1, score_team2, tournament_id
        )
      `)
      .eq('status', 'completed');

    if (vetoSessions) {
      for (const session of vetoSessions) {
        const match = session.match;
        if (match && match.tournament_id === tournamentId) {
          if (match.winner_id && (match.score_team1 > 0 || match.score_team2 > 0) && match.status !== 'completed') {
            issues.push(`Match ${match.id} has veto complete and winner but not marked complete`);
            suggestions.push(`Process match ${match.id} results to advance bracket`);
            nextActions.push(`PROCESS_MATCH_RESULTS ${match.id}`);
          }
        }
      }
    }

  } catch (error: any) {
    issues.push(`Diagnostic error: ${error.message}`);
  }

  return { tournamentId, issues, suggestions, nextActions };
}

export async function autoFixBracketProgression(tournamentId: string): Promise<{
  success: boolean;
  fixesApplied: string[];
  errors: string[];
}> {
  const fixesApplied: string[] = [];
  const errors: string[] = [];

  try {
    const diagnostic = await diagnoseBracketProgression(tournamentId);
    
    // Apply automatic fixes
    for (const action of diagnostic.nextActions) {
      try {
        if (action.startsWith('UPDATE matches SET')) {
          // Parse and execute SQL updates
          const parts = action.match(/UPDATE matches SET (.+) WHERE id = '(.+)'/);
          if (parts) {
            const [, setClause, matchId] = parts;
            const updates: any = {};
            
            if (setClause.includes('team1_id =')) {
              const teamId = setClause.match(/team1_id = '(.+?)'/)?.[1];
              if (teamId) updates.team1_id = teamId;
            }
            if (setClause.includes('team2_id =')) {
              const teamId = setClause.match(/team2_id = '(.+?)'/)?.[1];
              if (teamId) updates.team2_id = teamId;
            }
            if (setClause.includes("status = 'live'")) {
              updates.status = 'live';
            }

            const { error } = await supabase
              .from('matches')
              .update(updates)
              .eq('id', matchId);

            if (error) throw error;
            fixesApplied.push(`Fixed match ${matchId}: ${setClause}`);
          }
        } else if (action.startsWith('PROCESS_MATCH_RESULTS')) {
          const matchId = action.split(' ')[1];
          // This would need to be handled by calling processMatchResults
          fixesApplied.push(`Flagged match ${matchId} for result processing`);
        }
      } catch (error: any) {
        errors.push(`Failed to apply fix: ${action} - ${error.message}`);
      }
    }

    return { success: errors.length === 0, fixesApplied, errors };
  } catch (error: any) {
    errors.push(`Auto-fix error: ${error.message}`);
    return { success: false, fixesApplied, errors };
  }
}
