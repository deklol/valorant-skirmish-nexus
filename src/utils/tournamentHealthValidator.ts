
import { supabase } from "@/integrations/supabase/client";

export interface TournamentHealthIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  category: 'status' | 'teams' | 'matches' | 'bracket' | 'players';
}

export interface TournamentHealthReport {
  isHealthy: boolean;
  issues: TournamentHealthIssue[];
  canGoLive: boolean;
  canComplete: boolean;
}

export async function validateTournamentHealth(tournamentId: string): Promise<TournamentHealthReport> {
  const issues: TournamentHealthIssue[] = [];
  
  try {
    // Get tournament data
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      return {
        isHealthy: false,
        issues: [{ severity: 'error', message: 'Tournament not found', category: 'status' }],
        canGoLive: false,
        canComplete: false
      };
    }

    // Get related data
    const [
      { data: signups, count: signupCount },
      { data: teams, count: teamCount },
      { data: matches, count: matchCount },
      { data: checkedInSignups, count: checkedInCount }
    ] = await Promise.all([
      supabase.from('tournament_signups').select('*', { count: 'exact' }).eq('tournament_id', tournamentId),
      supabase.from('teams').select('*', { count: 'exact' }).eq('tournament_id', tournamentId),
      supabase.from('matches').select('*', { count: 'exact' }).eq('tournament_id', tournamentId),
      supabase.from('tournament_signups').select('*', { count: 'exact' }).eq('tournament_id', tournamentId).eq('is_checked_in', true)
    ]);

    // Status-based validation
    if (tournament.status === 'live' || tournament.status === 'completed') {
      if (!teamCount || teamCount < 2) {
        issues.push({
          severity: 'error',
          message: 'Tournament marked as live/completed but has fewer than 2 teams',
          category: 'teams'
        });
      }

      if (!matchCount || matchCount === 0) {
        issues.push({
          severity: 'error',
          message: 'Tournament marked as live/completed but has no matches',
          category: 'matches'
        });
      }
    }

    // Team validation
    if (teamCount && teamCount > 0) {
      // Check for teams without members
      const { data: teamsWithMembers } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          team_members(count)
        `)
        .eq('tournament_id', tournamentId);

      const emptyTeams = teamsWithMembers?.filter(team => 
        !team.team_members || team.team_members.length === 0
      );

      if (emptyTeams && emptyTeams.length > 0) {
        issues.push({
          severity: 'warning',
          message: `${emptyTeams.length} team(s) have no members`,
          category: 'teams'
        });
      }
    }

    // Match validation
    if (matchCount && matchCount > 0) {
      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, team1_id, team2_id, status, winner_id, round_number')
        .eq('tournament_id', tournamentId);

      // Check for matches with missing teams
      const incompleteMatches = matchesData?.filter(match => 
        !match.team1_id || !match.team2_id
      );

      if (incompleteMatches && incompleteMatches.length > 0) {
        issues.push({
          severity: 'error',
          message: `${incompleteMatches.length} match(es) missing team assignments`,
          category: 'matches'
        });
      }

      // Check for completed matches without winners
      const completedWithoutWinner = matchesData?.filter(match => 
        match.status === 'completed' && !match.winner_id
      );

      if (completedWithoutWinner && completedWithoutWinner.length > 0) {
        issues.push({
          severity: 'error',
          message: `${completedWithoutWinner.length} completed match(es) missing winner`,
          category: 'matches'
        });
      }
    }

    // Check-in validation
    if (tournament.check_in_required && tournament.status !== 'draft') {
      if (!checkedInCount || checkedInCount === 0) {
        issues.push({
          severity: 'warning',
          message: 'No players have checked in yet',
          category: 'players'
        });
      } else if (signupCount && checkedInCount < signupCount / 2) {
        issues.push({
          severity: 'info',
          message: `Only ${checkedInCount}/${signupCount} players have checked in`,
          category: 'players'
        });
      }
    }

    // Determine health status
    const hasErrors = issues.some(issue => issue.severity === 'error');
    const canGoLive = !hasErrors && (teamCount || 0) >= 2 && (matchCount || 0) > 0;
    
    // Enhanced completion check using proper final match detection
    let canComplete = false;
    if (matchCount && matchCount > 0 && teamCount && teamCount >= 2) {
      const { calculateBracketStructure, findTournamentFinal } = await import("./bracketCalculations");
      
      try {
        const bracketStructure = calculateBracketStructure(teamCount);
        const { data: allMatches } = await supabase
          .from('matches')
          .select('id, winner_id, status, round_number, match_number')
          .eq('tournament_id', tournamentId);

        if (allMatches) {
          const finalMatch = findTournamentFinal(allMatches, teamCount);
          canComplete = finalMatch?.status === 'completed' && !!finalMatch.winner_id;
          
          // Add specific check for 2-team tournaments
          if (teamCount === 2 && !canComplete) {
            const r1m1 = allMatches.find(m => m.round_number === 1 && m.match_number === 1);
            if (r1m1 && r1m1.status !== 'completed') {
              issues.push({
                severity: 'info',
                message: '2-team tournament: Round 1 Match 1 is the final - complete it to finish tournament',
                category: 'matches'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error checking tournament completion:', error);
        issues.push({
          severity: 'warning',
          message: 'Could not validate tournament completion status',
          category: 'bracket'
        });
      }
    }

    return {
      isHealthy: !hasErrors,
      issues,
      canGoLive,
      canComplete
    };

  } catch (error) {
    console.error('Error validating tournament health:', error);
    return {
      isHealthy: false,
      issues: [{
        severity: 'error',
        message: 'Failed to validate tournament health',
        category: 'status'
      }],
      canGoLive: false,
      canComplete: false
    };
  }
}

export function getHealthSummary(report: TournamentHealthReport): string {
  if (report.isHealthy) return "Tournament is healthy";
  
  const errorCount = report.issues.filter(i => i.severity === 'error').length;
  const warningCount = report.issues.filter(i => i.severity === 'warning').length;
  
  if (errorCount > 0) {
    return `${errorCount} critical issue${errorCount > 1 ? 's' : ''} found`;
  }
  
  if (warningCount > 0) {
    return `${warningCount} warning${warningCount > 1 ? 's' : ''} found`;
  }
  
  return "Minor issues detected";
}
