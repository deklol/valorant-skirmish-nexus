
/**
 * Dynamic bracket calculations for any tournament size
 */

export interface BracketStructure {
  totalRounds: number;
  totalMatches: number;
  matchesPerRound: number[];
  teamCount: number;
  isPowerOfTwo: boolean;
}

export interface MatchPosition {
  round: number;
  matchNumber: number;
  nextRound?: number;
  nextMatchNumber?: number;
  isFirstRoundBye?: boolean;
}

/**
 * Calculate complete bracket structure for any number of teams
 */
export function calculateBracketStructure(teamCount: number): BracketStructure {
  if (teamCount < 2) {
    throw new Error("Tournament needs at least 2 teams");
  }

  const isPowerOfTwo = (teamCount & (teamCount - 1)) === 0;
  
  // For single elimination, we need log2(teamCount) rounds (rounded up)
  const totalRounds = Math.ceil(Math.log2(teamCount));
  
  // Calculate matches per round (working backwards from final)
  const matchesPerRound: number[] = [];
  for (let round = totalRounds; round >= 1; round--) {
    const matchesInRound = Math.pow(2, round - 1);
    matchesPerRound.unshift(matchesInRound);
  }
  
  const totalMatches = matchesPerRound.reduce((sum, matches) => sum + matches, 0);
  
  return {
    totalRounds,
    totalMatches,
    matchesPerRound,
    teamCount,
    isPowerOfTwo
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
 */
export function validateBracketProgression(
  matches: any[],
  bracketStructure: BracketStructure
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
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
  
  return {
    isValid: issues.length === 0,
    issues
  };
}
