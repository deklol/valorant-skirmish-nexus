
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
 * FIXED: Added type checking to prevent object parameters
 */
export function calculateBracketStructure(originalTeamCount: number | any): BracketStructure {
  // CRITICAL FIX: Type checking to prevent objects being passed
  if (typeof originalTeamCount !== 'number' || isNaN(originalTeamCount)) {
    console.error('❌ calculateBracketStructure received invalid input:', originalTeamCount, typeof originalTeamCount);
    throw new Error(`calculateBracketStructure expects a number, got ${typeof originalTeamCount}: ${originalTeamCount}`);
  }

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
 * CRITICAL FIX: Better diagnostics and handles missing matches
 */
export function validateBracketProgression(
  matches: any[],
  originalTeamCount: number | any
): BracketValidationResult {
  const issues: string[] = [];
  let tournamentComplete = false;
  let winner: string | undefined;
  
  // CRITICAL FIX: Type checking to prevent objects being passed
  if (typeof originalTeamCount !== 'number' || isNaN(originalTeamCount)) {
    console.error('❌ validateBracketProgression received invalid teamCount:', originalTeamCount, typeof originalTeamCount);
    issues.push(`Invalid team count provided: ${typeof originalTeamCount}`);
    return { isValid: false, issues, tournamentComplete };
  }

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
  
  console.log('📋 Matches by round:', Object.fromEntries(Object.entries(matchesByRound).map(([round, matches]) => [round, matches.map(m => `M${m.match_number}`)])));
  
  // Check each round has expected number of matches
  bracketStructure.matchesPerRound.forEach((expectedMatches, index) => {
    const round = index + 1;
    const actualMatches = matchesByRound[round]?.length || 0;
    
    if (actualMatches !== expectedMatches) {
      issues.push(`Round ${round} has ${actualMatches} matches, expected ${expectedMatches}`);
    }
  });
  
  // CRITICAL FIX: Check for completed matches whose winners haven't been advanced
  for (let round = 1; round < bracketStructure.totalRounds; round++) {
    const roundMatches = matchesByRound[round] || [];
    const nextRoundMatches = matchesByRound[round + 1] || [];
    
    roundMatches.forEach(match => {
      if (match.status === 'completed' && match.winner_id) {
        console.log(`🔍 Checking progression for R${round}M${match.match_number} winner: ${match.winner_id}`);
        
        const nextPos = findNextMatchPosition(round, match.match_number, bracketStructure);
        if (nextPos) {
          const nextMatch = nextRoundMatches.find(m => m.match_number === nextPos.matchNumber);
          if (!nextMatch) {
            issues.push(`Round ${round} Match ${match.match_number} should advance to Round ${nextPos.round} Match ${nextPos.matchNumber} but that match doesn't exist`);
          } else {
            const expectedSlot = getWinnerSlot(match.match_number);
            const actualWinnerInNextRound = nextMatch[expectedSlot];
            
            console.log(`🎯 R${round}M${match.match_number} winner ${match.winner_id} should be in R${nextPos.round}M${nextPos.matchNumber} slot ${expectedSlot}, currently: ${actualWinnerInNextRound}`);
            
            if (actualWinnerInNextRound !== match.winner_id) {
              issues.push(`Round ${round} Match ${match.match_number} winner (${match.winner_id?.slice(0,8)}) not advanced to Round ${nextPos.round} Match ${nextPos.matchNumber}`);
            }
          }
        }
      }
    });
  }
  
  // Check for empty matches in later rounds when previous rounds have completed matches
  for (let round = 2; round <= bracketStructure.totalRounds; round++) {
    const roundMatches = matchesByRound[round] || [];
    const prevRoundMatches = matchesByRound[round - 1] || [];
    
    // Count completed matches in previous round
    const completedPrevMatches = prevRoundMatches.filter(m => m.status === 'completed' && m.winner_id);
    
    if (completedPrevMatches.length > 0) {
      // Check if current round matches are missing teams
      roundMatches.forEach(match => {
        if (!match.team1_id && !match.team2_id) {
          issues.push(`Round ${round} Match ${match.match_number} has no teams assigned despite completed matches in Round ${round - 1}`);
        } else if (!match.team1_id || !match.team2_id) {
          issues.push(`Round ${round} Match ${match.match_number} is missing one team assignment`);
        }
      });
    }
  }
  
  // Check if tournament is complete (final match decided)
  const finalRound = bracketStructure.totalRounds;
  const finalMatches = matchesByRound[finalRound] || [];
  if (finalMatches.length === 1 && finalMatches[0].status === 'completed' && finalMatches[0].winner_id) {
    tournamentComplete = true;
    winner = finalMatches[0].winner_id;
  }
  
  console.log(`🔍 Bracket validation complete: ${issues.length} issues found`, issues);
  
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
 * CRITICAL FIX: Better detection and handles missing next matches
 */
export function getMatchesNeedingProgression(
  matches: any[],
  originalTeamCount: number | any
): any[] {
  // CRITICAL FIX: Type checking to prevent objects being passed
  if (typeof originalTeamCount !== 'number' || isNaN(originalTeamCount)) {
    console.error('❌ getMatchesNeedingProgression received invalid teamCount:', originalTeamCount, typeof originalTeamCount);
    return [];
  }

  const bracketStructure = calculateBracketStructure(originalTeamCount);
  
  console.log(`🔄 Checking for matches needing progression in ${originalTeamCount}-team tournament`);
  
  const needingProgression = matches.filter(match => {
    // Must be completed with a winner
    if (match.status !== 'completed' || !match.winner_id) {
      return false;
    }
    
    // Final round doesn't advance anywhere
    if (match.round_number >= bracketStructure.totalRounds) {
      return false;
    }
    
    const nextPos = findNextMatchPosition(match.round_number, match.match_number, bracketStructure);
    if (!nextPos) {
      return false;
    }
    
    const nextMatch = matches.find(m => 
      m.round_number === nextPos.round && m.match_number === nextPos.matchNumber
    );
    if (!nextMatch) {
      console.log(`⚠️ R${match.round_number}M${match.match_number} winner should go to R${nextPos.round}M${nextPos.matchNumber} but that match doesn't exist`);
      return false; // Can't progress if next match doesn't exist
    }
    
    const expectedSlot = getWinnerSlot(match.match_number);
    const currentWinnerInSlot = nextMatch[expectedSlot];
    
    const needsProgression = currentWinnerInSlot !== match.winner_id;
    
    if (needsProgression) {
      console.log(`🎯 R${match.round_number}M${match.match_number} winner ${match.winner_id?.slice(0,8)} needs to advance to R${nextPos.round}M${nextPos.matchNumber} slot ${expectedSlot} (currently: ${currentWinnerInSlot?.slice(0,8) || 'empty'})`);
    }
    
    return needsProgression;
  });
  
  console.log(`🔄 Found ${needingProgression.length} matches needing progression`);
  return needingProgression;
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
  
  const count = teams.length;
  console.log(`📊 Original team count for tournament ${tournamentId}: ${count}`);
  return count;
}
