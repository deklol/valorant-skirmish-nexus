/**
 * Format-specific bracket generation utilities
 * Supports: Single Elimination, Double Elimination, Swiss, Round Robin
 */

import { supabase } from "@/integrations/supabase/client";

export type BracketType = 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin' | 'group_stage_knockout';

export interface Team {
  id: string;
  name: string;
  seed?: number;
}

export interface GeneratedMatch {
  tournament_id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  status: 'pending' | 'live' | 'completed';
  best_of: number;
  score_team1: number;
  score_team2: number;
  bracket_position?: string; // 'winners' | 'losers' | 'grand_final' for double elim
  notes?: string;
  winner_id?: string | null;
}

// ============================================================================
// SINGLE ELIMINATION
// ============================================================================

export function calculateSingleEliminationStructure(teamCount: number) {
  if (teamCount < 2) throw new Error("Need at least 2 teams");
  
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const totalRounds = Math.ceil(Math.log2(teamCount));
  const firstRoundByes = nextPowerOfTwo - teamCount;
  
  const matchesPerRound: number[] = [];
  let matchesInRound = nextPowerOfTwo / 2;
  
  for (let round = 1; round <= totalRounds; round++) {
    matchesPerRound.push(matchesInRound);
    matchesInRound = matchesInRound / 2;
  }
  
  return { totalRounds, matchesPerRound, firstRoundByes, totalMatches: matchesPerRound.reduce((a, b) => a + b, 0) };
}

export function generateSingleEliminationMatches(
  tournamentId: string, 
  teams: Team[], 
  bestOf: number = 1
): GeneratedMatch[] {
  const structure = calculateSingleEliminationStructure(teams.length);
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  const matches: GeneratedMatch[] = [];
  
  for (let round = 1; round <= structure.totalRounds; round++) {
    const matchesInRound = structure.matchesPerRound[round - 1];
    
    for (let matchInRound = 1; matchInRound <= matchesInRound; matchInRound++) {
      const match: GeneratedMatch = {
        tournament_id: tournamentId,
        round_number: round,
        match_number: matchInRound,
        team1_id: null,
        team2_id: null,
        status: 'pending',
        best_of: bestOf,
        score_team1: 0,
        score_team2: 0,
        bracket_position: 'winners'
      };
      
      // Assign teams to first round only
      if (round === 1) {
        const team1Index = (matchInRound - 1) * 2;
        const team2Index = team1Index + 1;
        
        if (team1Index < shuffledTeams.length) {
          match.team1_id = shuffledTeams[team1Index].id;
        }
        if (team2Index < shuffledTeams.length) {
          match.team2_id = shuffledTeams[team2Index].id;
        }
      }
      
      matches.push(match);
    }
  }
  
  return matches;
}

// ============================================================================
// DOUBLE ELIMINATION
// ============================================================================

export function calculateDoubleEliminationStructure(teamCount: number) {
  if (teamCount < 2) throw new Error("Need at least 2 teams");
  
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const winnersRounds = Math.ceil(Math.log2(teamCount));
  
  // Losers bracket has more rounds (roughly 2 * winners rounds - 1)
  // Each losers round either has matches from winners dropdowns or internal losers matches
  const losersRounds = (winnersRounds - 1) * 2;
  
  const winnersMatchesPerRound: number[] = [];
  let matchesInRound = nextPowerOfTwo / 2;
  for (let round = 1; round <= winnersRounds; round++) {
    winnersMatchesPerRound.push(matchesInRound);
    matchesInRound = matchesInRound / 2;
  }
  
  // Losers bracket structure
  const losersMatchesPerRound: number[] = [];
  let losersMatches = winnersMatchesPerRound[0] / 2; // First losers round = half of winners R1 losers
  for (let round = 1; round <= losersRounds; round++) {
    losersMatchesPerRound.push(Math.max(1, Math.ceil(losersMatches)));
    // Every other round, the count halves (alternating between "feed" and "halving" rounds)
    if (round % 2 === 0) {
      losersMatches = losersMatches / 2;
    }
  }
  
  return { 
    winnersRounds, 
    losersRounds, 
    winnersMatchesPerRound, 
    losersMatchesPerRound,
    hasGrandFinal: true,
    hasReset: true // Grand final reset if losers bracket winner wins
  };
}

export function generateDoubleEliminationMatches(
  tournamentId: string, 
  teams: Team[], 
  bestOf: number = 1
): GeneratedMatch[] {
  const structure = calculateDoubleEliminationStructure(teams.length);
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  const matches: GeneratedMatch[] = [];
  
  // Winners bracket matches
  for (let round = 1; round <= structure.winnersRounds; round++) {
    const matchesInRound = structure.winnersMatchesPerRound[round - 1];
    
    for (let matchInRound = 1; matchInRound <= matchesInRound; matchInRound++) {
      const match: GeneratedMatch = {
        tournament_id: tournamentId,
        round_number: round,
        match_number: matchInRound,
        team1_id: null,
        team2_id: null,
        status: 'pending',
        best_of: bestOf,
        score_team1: 0,
        score_team2: 0,
        bracket_position: 'winners',
        notes: `Winners Round ${round}`
      };
      
      // Assign teams to first round only
      if (round === 1) {
        const team1Index = (matchInRound - 1) * 2;
        const team2Index = team1Index + 1;
        
        if (team1Index < shuffledTeams.length) {
          match.team1_id = shuffledTeams[team1Index].id;
        }
        if (team2Index < shuffledTeams.length) {
          match.team2_id = shuffledTeams[team2Index].id;
        }
      }
      
      matches.push(match);
    }
  }
  
  // Losers bracket matches - use negative round numbers to differentiate
  // Convention: Losers round 1 = round -1, losers round 2 = round -2, etc.
  for (let round = 1; round <= structure.losersRounds; round++) {
    const matchesInRound = structure.losersMatchesPerRound[round - 1];
    
    for (let matchInRound = 1; matchInRound <= matchesInRound; matchInRound++) {
      const match: GeneratedMatch = {
        tournament_id: tournamentId,
        round_number: -round, // Negative for losers bracket
        match_number: matchInRound,
        team1_id: null,
        team2_id: null,
        status: 'pending',
        best_of: bestOf,
        score_team1: 0,
        score_team2: 0,
        bracket_position: 'losers',
        notes: `Losers Round ${round}`
      };
      
      matches.push(match);
    }
  }
  
  // Grand Final (round = winnersRounds + 1)
  matches.push({
    tournament_id: tournamentId,
    round_number: structure.winnersRounds + 1,
    match_number: 1,
    team1_id: null,
    team2_id: null,
    status: 'pending',
    best_of: bestOf,
    score_team1: 0,
    score_team2: 0,
    bracket_position: 'grand_final',
    notes: 'Grand Final'
  });
  
  // Grand Final Reset (round = winnersRounds + 2)
  matches.push({
    tournament_id: tournamentId,
    round_number: structure.winnersRounds + 2,
    match_number: 1,
    team1_id: null,
    team2_id: null,
    status: 'pending',
    best_of: bestOf,
    score_team1: 0,
    score_team2: 0,
    bracket_position: 'grand_final',
    notes: 'Grand Final Reset (if needed)'
  });
  
  return matches;
}

// ============================================================================
// SWISS
// ============================================================================

export function calculateSwissRounds(teamCount: number, customRounds?: number): number {
  if (customRounds && customRounds > 0) return customRounds;
  // Standard Swiss: log2(n) rounds, minimum 3, maximum proportional to team count
  return Math.max(3, Math.min(Math.ceil(Math.log2(teamCount)) + 1, Math.floor(teamCount / 2)));
}

export function generateSwissFirstRoundMatches(
  tournamentId: string, 
  teams: Team[], 
  totalRounds: number,
  bestOf: number = 1
): GeneratedMatch[] {
  // Swiss only generates round 1 initially - subsequent rounds are generated after each round completes
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  const matches: GeneratedMatch[] = [];
  const matchCount = Math.floor(shuffledTeams.length / 2);
  
  for (let i = 0; i < matchCount; i++) {
    matches.push({
      tournament_id: tournamentId,
      round_number: 1,
      match_number: i + 1,
      team1_id: shuffledTeams[i * 2].id,
      team2_id: shuffledTeams[i * 2 + 1]?.id || null,
      status: 'pending',
      best_of: bestOf,
      score_team1: 0,
      score_team2: 0,
      bracket_position: 'swiss',
      notes: `Swiss Round 1 of ${totalRounds}`
    });
  }
  
  // Handle bye if odd number of teams
  if (shuffledTeams.length % 2 === 1) {
    matches.push({
      tournament_id: tournamentId,
      round_number: 1,
      match_number: matchCount + 1,
      team1_id: shuffledTeams[shuffledTeams.length - 1].id,
      team2_id: null, // Bye
      status: 'completed', // Auto-complete bye matches
      best_of: bestOf,
      score_team1: 1,
      score_team2: 0,
      bracket_position: 'swiss',
      notes: 'Bye'
    });
  }
  
  return matches;
}

// ============================================================================
// ROUND ROBIN
// ============================================================================

export function calculateRoundRobinStructure(teamCount: number) {
  // Round robin: each team plays every other team once
  // Total matches = n * (n-1) / 2
  // Rounds = n - 1 (if even) or n (if odd, with byes)
  const totalMatches = (teamCount * (teamCount - 1)) / 2;
  const totalRounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount;
  const matchesPerRound = Math.floor(teamCount / 2);
  
  return { totalMatches, totalRounds, matchesPerRound };
}

export function generateRoundRobinMatches(
  tournamentId: string, 
  teams: Team[], 
  bestOf: number = 1
): GeneratedMatch[] {
  const n = teams.length;
  const matches: GeneratedMatch[] = [];
  
  // Use circle method for round robin scheduling
  // Fix one team and rotate others
  const teamsArray = [...teams];
  
  // If odd number of teams, add a dummy for byes
  const hasBye = n % 2 === 1;
  if (hasBye) {
    teamsArray.push({ id: 'BYE', name: 'Bye' });
  }
  
  const numTeams = teamsArray.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  
  for (let round = 0; round < numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = (round + match) % (numTeams - 1);
      let away = (numTeams - 1 - match + round) % (numTeams - 1);
      
      // Last team stays fixed
      if (match === 0) {
        away = numTeams - 1;
      }
      
      const team1 = teamsArray[home];
      const team2 = teamsArray[away];
      
      // Skip bye matches (don't create them, or create as auto-completed)
      if (team1.id === 'BYE' || team2.id === 'BYE') {
        const actualTeam = team1.id === 'BYE' ? team2 : team1;
        matches.push({
          tournament_id: tournamentId,
          round_number: round + 1,
          match_number: match + 1,
          team1_id: actualTeam.id,
          team2_id: null,
          status: 'completed',
          best_of: bestOf,
          score_team1: 1,
          score_team2: 0,
          bracket_position: 'round_robin',
          notes: 'Bye'
        });
      } else {
        matches.push({
          tournament_id: tournamentId,
          round_number: round + 1,
          match_number: match + 1,
          team1_id: team1.id,
          team2_id: team2.id,
          status: 'pending',
          best_of: bestOf,
          score_team1: 0,
          score_team2: 0,
          bracket_position: 'round_robin',
          notes: `Round Robin - Round ${round + 1}`
        });
      }
    }
  }
  
  return matches;
}

// ============================================================================
// UNIFIED GENERATOR
// ============================================================================

export async function generateBracketForFormat(
  tournamentId: string,
  teams: Team[],
  bracketType: BracketType,
  bestOf: number = 1,
  swissRounds?: number
): Promise<{ success: boolean; matches: GeneratedMatch[]; error?: string }> {
  try {
    if (teams.length < 2) {
      return { success: false, matches: [], error: "Need at least 2 teams" };
    }
    
    let matches: GeneratedMatch[];
    
    switch (bracketType) {
      case 'single_elimination':
        matches = generateSingleEliminationMatches(tournamentId, teams, bestOf);
        break;
        
      case 'double_elimination':
        matches = generateDoubleEliminationMatches(tournamentId, teams, bestOf);
        break;
        
      case 'swiss':
        const totalSwissRounds = calculateSwissRounds(teams.length, swissRounds);
        matches = generateSwissFirstRoundMatches(tournamentId, teams, totalSwissRounds, bestOf);
        // Store total rounds in tournament for reference
        await supabase
          .from('tournaments')
          .update({ swiss_rounds: totalSwissRounds })
          .eq('id', tournamentId);
        break;
        
      case 'round_robin':
        matches = generateRoundRobinMatches(tournamentId, teams, bestOf);
        break;
        
      default:
        return { success: false, matches: [], error: `Unknown bracket type: ${bracketType}` };
    }
    
    return { success: true, matches };
    
  } catch (error: any) {
    console.error('Error generating bracket:', error);
    return { success: false, matches: [], error: error.message };
  }
}

// ============================================================================
// FORMAT INFO HELPERS
// ============================================================================

export function getFormatDisplayName(bracketType: BracketType): string {
  const names: Record<BracketType, string> = {
    single_elimination: 'Single Elimination',
    double_elimination: 'Double Elimination',
    swiss: 'Swiss',
    round_robin: 'Round Robin',
    group_stage_knockout: 'Group Stage + Knockout'
  };
  return names[bracketType] || bracketType;
}

export function getFormatDescription(bracketType: BracketType): string {
  const descriptions: Record<BracketType, string> = {
    single_elimination: 'One loss and you\'re out. Fast and decisive.',
    double_elimination: 'Two losses to be eliminated. Features winners and losers brackets.',
    swiss: 'Points-based pairing system. Teams play multiple rounds without elimination.',
    round_robin: 'Every team plays every other team. Most comprehensive ranking.',
    group_stage_knockout: 'Teams compete in groups, top finishers advance to single elimination knockout.'
  };
  return descriptions[bracketType] || '';
}
