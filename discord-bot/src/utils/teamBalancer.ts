/**
 * Team Balancer for Discord Quick Matches
 * Simplified version of the website's balancing system
 */
import { calculateAdaptiveWeight, ExtendedUserRankData } from './adaptiveWeightSystem.js';

export interface BalancerPlayer {
  index: number;
  discord_username: string;
  discord_id: string;
  evidenceWeight: number;
  isElite?: boolean;
  userData: ExtendedUserRankData;
}

export interface TeamAssignment {
  teamIndex: number;
  reasoning: string;
  confidence: number;
}

export interface BalanceResult {
  assignments: TeamAssignment[];
  balance: {
    score: number;
    variance: number;
    teamWeights: number[];
  };
  metadata: {
    algorithm: string;
    iterations: number;
    warnings: string[];
  };
}

/**
 * Balance 10 players into 2 teams of 5 using adaptive weights
 */
export async function balanceQuickMatchTeams(
  players: BalancerPlayer[]
): Promise<BalanceResult> {
  
  console.log(`🔧 Quick Match Balancer: ${players.length} players → 2 teams of 5`);
  
  const warnings: string[] = [];
  
  // Validate inputs
  if (players.length !== 10) {
    throw new Error(`Expected exactly 10 players, got ${players.length}`);
  }
  
  // Sort players by weight (descending)
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
  
  const teams: number[][] = [[], []];
  const teamWeights = [0, 0];
  
  // Pairwise assignment: strongest with weakest
  let frontIndex = 0;
  let backIndex = sortedPlayers.length - 1;
  let iterations = 0;
  
  while (frontIndex <= backIndex && (teams[0].length < 5 || teams[1].length < 5)) {
    // Determine which team should get the stronger player
    const team0NeedsMore = teams[0].length < 5 && (teams[1].length >= 5 || teamWeights[0] <= teamWeights[1]);
    
    if (frontIndex === backIndex) {
      // Last player - assign to lighter team that has space
      const targetTeam = teams[0].length < 5 && teamWeights[0] <= teamWeights[1] ? 0 : 1;
      if (teams[targetTeam].length < 5) {
        teams[targetTeam].push(sortedPlayers[frontIndex].index);
        teamWeights[targetTeam] += sortedPlayers[frontIndex].evidenceWeight;
      }
      break;
    }
    
    // Assign pair to balance teams
    if (team0NeedsMore && teams[0].length < 5) {
      teams[0].push(sortedPlayers[frontIndex].index);
      teamWeights[0] += sortedPlayers[frontIndex].evidenceWeight;
      frontIndex++;
      
      if (teams[1].length < 5 && backIndex >= frontIndex) {
        teams[1].push(sortedPlayers[backIndex].index);
        teamWeights[1] += sortedPlayers[backIndex].evidenceWeight;
        backIndex--;
      }
    } else if (teams[1].length < 5) {
      teams[1].push(sortedPlayers[frontIndex].index);
      teamWeights[1] += sortedPlayers[frontIndex].evidenceWeight;
      frontIndex++;
      
      if (teams[0].length < 5 && backIndex >= frontIndex) {
        teams[0].push(sortedPlayers[backIndex].index);
        teamWeights[0] += sortedPlayers[backIndex].evidenceWeight;
        backIndex--;
      }
    } else {
      break; // Both teams full
    }
    
    iterations++;
  }
  
  const balance = Math.abs(teamWeights[0] - teamWeights[1]);
  
  // Convert to assignment format
  const assignments: TeamAssignment[] = [];
  
  for (let teamIndex = 0; teamIndex < 2; teamIndex++) {
    for (const playerIndex of teams[teamIndex]) {
      assignments.push({
        teamIndex,
        reasoning: `Pairwise optimization (balance: ${balance.toFixed(1)})`,
        confidence: calculateAssignmentConfidence(balance, 50) // 50 point threshold
      });
    }
  }
  
  const avgWeight = (teamWeights[0] + teamWeights[1]) / 2;
  const variance = ((teamWeights[0] - avgWeight) ** 2 + (teamWeights[1] - avgWeight) ** 2) / 2;
  
  return {
    assignments,
    balance: {
      score: balance,
      variance,
      teamWeights
    },
    metadata: {
      algorithm: 'Pairwise Optimization',
      iterations,
      warnings
    }
  };
}

/**
 * Calculate confidence score for assignment
 */
function calculateAssignmentConfidence(balance: number, threshold: number): number {
  if (balance <= threshold * 0.5) return 0.95;
  if (balance <= threshold) return 0.85;
  if (balance <= threshold * 1.5) return 0.70;
  return 0.50;
}

/**
 * Convert player data to balancer format with adaptive weights
 */
export async function convertPlayersForBalancing(
  queuePlayers: any[]
): Promise<BalancerPlayer[]> {
  const balancerPlayers: BalancerPlayer[] = [];
  
  for (let i = 0; i < queuePlayers.length; i++) {
    const player = queuePlayers[i];
    const userData = player.users || player;
    
    // Calculate adaptive weight
    const adaptiveResult = calculateAdaptiveWeight({
      current_rank: userData.current_rank,
      peak_rank: userData.peak_rank,
      manual_rank_override: userData.manual_rank_override,
      manual_weight_override: userData.manual_weight_override,
      use_manual_override: userData.use_manual_override,
      tournaments_won: userData.tournaments_won,
      last_tournament_win: userData.last_tournament_win
    });
    
    const evidenceWeight = adaptiveResult.points;
    const isElite = evidenceWeight >= 400; // Immortal+ threshold
    
    balancerPlayers.push({
      index: i,
      discord_username: userData.discord_username,
      discord_id: userData.discord_id,
      evidenceWeight,
      isElite,
      userData: {
        current_rank: userData.current_rank,
        peak_rank: userData.peak_rank,
        manual_rank_override: userData.manual_rank_override,
        manual_weight_override: userData.manual_weight_override,
        use_manual_override: userData.use_manual_override,
        tournaments_won: userData.tournaments_won,
        last_tournament_win: userData.last_tournament_win
      }
    });
  }
  
  return balancerPlayers;
}