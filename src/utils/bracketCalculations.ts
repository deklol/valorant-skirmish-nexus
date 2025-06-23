
/**
 * Dynamic bracket calculations for any tournament size
 * This is the SINGLE SOURCE OF TRUTH for all bracket logic
 */

export interface BracketStructure {
  totalRounds: number;
  totalMatches: number;
  matchesPerRound: number[];
  teamCount: number;
  isPowerOfTwo: boolean;
  firstRoundByes: number;
}

export interface MatchPosition {
  round: number;
  matchNumber: number;
  nextRound?: number;
  nextMatchNumber?: number;
  isFirstRoundBye?: boolean;
}

export interface BracketValidationResult {
  isValid: boolean;
  issues: string[];
  tournamentComplete: boolean;
  winner?: string;
}

/**
 * Calculate complete bracket structure for any number of teams
 * CRITICAL FIX: Always use ORIGINAL team count, not current active teams
 */
export function calculateBracketStructure(originalTeamCount: number): BracketStructure {
  if (originalTeamCount < 2) {
    throw new Error("Tournament needs at least 2 teams");
  }

  const isPowerOfTwo = (originalTeamCount & (originalTeamCount - 1)) === 0;
  
  // For single elimination, we need to find the next power of 2
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(originalTeamCount)));
  const totalRounds = Math.ceil(Math.log2(originalTeamCount));
  
  // Calculate byes for first round
  const firstRoundByes = nextPowerOfTwo - originalTeamCount;
  
  // FIXED: Calculate matches per round working FORWARD from Round 1
  const matchesPerRound: number[] = [];
  
  // Round 1: Start with half the next power of 2 (this accommodates byes)
  let matchesInRound = nextPowerOfTwo / 2;
  
  for (let round = 1; round <= totalRounds; round++) {
    matchesPerRound.push(matchesInRound);
    matchesInRound = matchesInRound / 2; // Each subsequent round has half the matches
  }
  
  const totalMatches = matchesPerRound.reduce((sum, matches) => sum + matches, 0);
  
  console.log(`🏗️ Bracket Structure for ${originalTeamCount} teams:`, {
    totalRounds,
    matchesPerRound,
    totalMatches,
    isPowerOfTwo,
    firstRoundByes
  });
  
  return {
    totalRounds,
    totalMatches,
    matchesPerRound,
    teamCount: originalTeamCount,
    isPowerOfTwo,
    firstRoundByes
  };
}

/**
 * Find where a match winner should advance to
 */
export function findNextMatchPosition(
  currentRound: number,
  currentMatchNumber: number,
  bracketStructure: BracketStructure
): MatchPosition | null {
  
  // If this is the final round, there's no next match
  if (currentRound >= bracketStructure.totalRounds) {
    return null;
  }
  
  const nextRound = currentRound + 1;
  
  // In single elimination: winners from matches N and N+1 go to match ceil(N/2) in next round
  const nextMatchNumber = Math.ceil(currentMatchNumber / 2);
  
  return {
    round: nextRound,
    matchNumber: nextMatchNumber,
    nextRound: nextRound < bracketStructure.totalRounds ? nextRound + 1 : undefined,
    nextMatchNumber: nextRound < bracketStructure.totalRounds ? Math.ceil(nextMatchNumber / 2) : undefined
  };
}

/**
 * Determine which team slot (team1 or team2) a winner should occupy
 */
export function getWinnerSlot(matchNumber: number): 'team1_id' | 'team2_id' {
  // Odd match numbers (1,3,5...) -> team1_id
  // Even match numbers (2,4,6...) -> team2_id
  return matchNumber % 2 === 1 ? 'team1_id' : 'team2_id';
}

/**
 * Validate bracket progression for any tournament structure
 * CRITICAL FIX: Use original team count for validation
 */
export function validateBracketProgression(
  matches: any[],
  originalTeamCount: number
): BracketValidationResult {
  const issues: string[] = [];
  let tournamentComplete = false;
  let winner: string | undefined;
  
  // Calculate bracket structure using ORIGINAL team count
  const bracketStructure = calculateBracketStructure(originalTeamCount);
  
  // Group matches by round
  const matchesByRound: Record<number, any[]> = {};
  matches.forEach(match => {
    if (!matchesByRound[match.round_number]) {
      matchesByRound[match.round_number] = [];
    }
    matchesByRound[match.round_number].push(match);
  });
  
  // Check each round has expected number of matches
  bracketStructure.matchesPerRound.forEach((expectedMatches, index) => {
    const round = index + 1;
    const actualMatches = matchesByRound[round]?.length || 0;
    
    if (actualMatches !== expectedMatches) {
      issues.push(`Round ${round} has ${actualMatches} matches, expected ${expectedMatches}`);
    }
  });
  
  // Check winner progression
  for (let round = 1; round < bracketStructure.totalRounds; round++) {
    const roundMatches = matchesByRound[round] || [];
    const nextRoundMatches = matchesByRound[round + 1] || [];
    
    roundMatches.forEach(match => {
      if (match.status === 'completed' && match.winner_id) {
        const nextPos = findNextMatchPosition(round, match.match_number, bracketStructure);
        if (nextPos) {
          const nextMatch = nextRoundMatches.find(m => m.match_number === nextPos.matchNumber);
          if (nextMatch) {
            const expectedSlot = getWinnerSlot(match.match_number);
            const actualWinner = nextMatch[expectedSlot];
            
            if (actualWinner !== match.winner_id) {
              issues.push(`Round ${round} Match ${match.match_number} winner not advanced to Round ${nextPos.round} Match ${nextPos.matchNumber}`);
            }
          }
        }
      }
    });
  }
  
  // Check if tournament is complete (final match decided)
  const finalRound = bracketStructure.totalRounds;
  const finalMatches = matchesByRound[finalRound] || [];
  if (finalMatches.length === 1 && finalMatches[0].status === 'completed' && finalMatches[0].winner_id) {
    tournamentComplete = true;
    winner = finalMatches[0].winner_id;
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    tournamentComplete,
    winner
  };
}

/**
 * Check if a specific match is the tournament final
 */
export function isTournamentFinal(
  match: any,
  bracketStructure: BracketStructure
): boolean {
  return match.round_number === bracketStructure.totalRounds && match.match_number === 1;
}

/**
 * Get all matches that should be ready to play (both teams assigned, status pending)
 */
export function getReadyMatches(matches: any[]): any[] {
  return matches.filter(match => 
    match.status === 'pending' && 
    match.team1_id && 
    match.team2_id
  );
}

/**
 * Get all completed matches that need their winners advanced
 * CRITICAL FIX: Use original team count for structure calculations
 */
export function getMatchesNeedingProgression(
  matches: any[],
  originalTeamCount: number
): any[] {
  const bracketStructure = calculateBracketStructure(originalTeamCount);
  
  return matches.filter(match => {
    if (match.status !== 'completed' || !match.winner_id) return false;
    if (match.round_number >= bracketStructure.totalRounds) return false; // Final round doesn't advance
    
    const nextPos = findNextMatchPosition(match.round_number, match.match_number, bracketStructure);
    if (!nextPos) return false;
    
    const nextMatch = matches.find(m => 
      m.round_number === nextPos.round && m.match_number === nextPos.matchNumber
    );
    if (!nextMatch) return false;
    
    const expectedSlot = getWinnerSlot(match.match_number);
    return nextMatch[expectedSlot] !== match.winner_id;
  });
}

/**
 * Get original team count for a tournament
 * CRITICAL: This function must return the ORIGINAL team count when bracket was created
 */
export async function getOriginalTeamCount(tournamentId: string): Promise<number> {
  // For now, we'll count all teams in the tournament (including eliminated)
  // TODO: Add initial_team_count column to tournaments table
  const { supabase } = await import("@/integrations/supabase/client");
  
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId);
    
  if (error || !teams) {
    console.error('Failed to get original team count:', error);
    return 0;
  }
  
  console.log(`📊 Original team count for tournament ${tournamentId}: ${teams.length}`);
  return teams.length;
}
