/**
 * Constraint-First Team Balancer
 * Replaces combinatorial optimization with efficient constraint-based assignment
 */

import { karmarkarKarpPartition, constrainedKarmarkarKarp, type KKPlayer } from './karmarkarKarpAlgorithm';

export interface ConstraintConfig {
  maxElitePerTeam: number;
  enforceRoleDistribution: boolean;
  allowPartialFill: boolean;
  balanceThreshold: number;
}

export interface BalancerPlayer {
  index: number;
  discord_username: string;
  evidenceWeight: number;
  isElite?: boolean;
  role?: string;
  peak_rank?: string;
}

export interface TeamAssignment {
  teamIndex: number;
  reasoning: string;
  confidence: number;
}

export interface ConstraintBalanceResult {
  assignments: TeamAssignment[];
  balance: {
    score: number;
    variance: number;
    teamWeights: number[];
  };
  metadata: {
    algorithm: string;
    iterations: number;
    constraintsEnforced: string[];
    warnings: string[];
  };
}

const DEFAULT_CONFIG: ConstraintConfig = {
  maxElitePerTeam: 2,
  enforceRoleDistribution: false,
  allowPartialFill: false,
  balanceThreshold: 50
};

/**
 * Main constraint-first balancing function
 */
export async function balanceTeamsConstraintFirst(
  players: BalancerPlayer[],
  existingTeams: any[][],
  numTeams: number,
  teamSize: number,
  config: ConstraintConfig = DEFAULT_CONFIG
): Promise<ConstraintBalanceResult> {
  
  console.log(`🔧 Constraint-First Balancer: ${players.length} players → ${numTeams} teams of ${teamSize}`);
  
  const warnings: string[] = [];
  const constraintsEnforced: string[] = [];
  
  // Validate inputs
  if (players.length > numTeams * teamSize) {
    warnings.push(`Too many players (${players.length}) for ${numTeams} teams of ${teamSize}`);
    if (!config.allowPartialFill) {
      throw new Error('Cannot fit all players without violating team size constraints');
    }
  }
  
  // Calculate current team sizes
  const currentTeamSizes = existingTeams.map(team => team.length);
  const totalExistingPlayers = currentTeamSizes.reduce((sum, size) => sum + size, 0);
  
  if (totalExistingPlayers > 0) {
    console.log(`📊 Existing teams: ${currentTeamSizes.join(', ')} players`);
  }
  
  // Convert players to KK format
  const kkPlayers: KKPlayer[] = players.map((player, index) => ({
    index,
    weight: player.evidenceWeight,
    constraints: {
      isElite: player.isElite || false,
      maxElitePerTeam: config.maxElitePerTeam
    }
  }));
  
  // Calculate remaining capacity per team
  const remainingCapacity = currentTeamSizes.map(size => Math.max(0, teamSize - size));
  const totalRemainingCapacity = remainingCapacity.reduce((sum, cap) => sum + cap, 0);
  
  if (players.length > totalRemainingCapacity) {
    warnings.push(`Not enough remaining capacity (${totalRemainingCapacity}) for ${players.length} players`);
  }
  
  // Choose algorithm based on constraints and team count
  let result;
  let algorithm: string;
  
  if (numTeams === 2) {
    // Special handling for 2-team tournaments
    result = balanceTwoTeamsOptimal(kkPlayers, teamSize, currentTeamSizes);
    algorithm = 'Pairwise Optimization';
    constraintsEnforced.push('2-Team Pair Balancing');
  } else if (config.maxElitePerTeam > 0 && kkPlayers.some(p => p.constraints?.isElite)) {
    // Use constrained KK for elite distribution
    result = constrainedKarmarkarKarp(kkPlayers, numTeams, teamSize, config.maxElitePerTeam);
    algorithm = 'Constrained Karmarkar-Karp';
    constraintsEnforced.push('Elite Distribution');
  } else {
    // Standard KK algorithm
    result = karmarkarKarpPartition(kkPlayers, numTeams, teamSize);
    algorithm = 'Karmarkar-Karp';
  }
  
  constraintsEnforced.push('Hard Team Size Limits');
  
  // Convert KK result to assignment format
  const assignments: TeamAssignment[] = [];
  
  for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
    for (const playerIndex of result.teams[teamIndex]) {
      const player = players[playerIndex];
      
      assignments.push({
        teamIndex,
        reasoning: `${algorithm} assignment (balance: ${result.balance.toFixed(1)})`,
        confidence: calculateAssignmentConfidence(result.balance, config.balanceThreshold)
      });
    }
  }
  
  // Calculate team weights for balance reporting
  const teamWeights = new Array(numTeams).fill(0);
  assignments.forEach((assignment, playerIndex) => {
    teamWeights[assignment.teamIndex] += players[playerIndex].evidenceWeight;
  });
  
  // Add existing team weights
  existingTeams.forEach((team, teamIndex) => {
    const existingWeight = team.reduce((sum, player) => sum + (player.evidenceWeight || 0), 0);
    teamWeights[teamIndex] += existingWeight;
  });
  
  const avgWeight = teamWeights.reduce((sum, w) => sum + w, 0) / numTeams;
  const variance = teamWeights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / numTeams;
  
  return {
    assignments,
    balance: {
      score: result.balance,
      variance,
      teamWeights
    },
    metadata: {
      algorithm,
      iterations: result.iterations,
      constraintsEnforced,
      warnings
    }
  };
}

/**
 * Specialized 2-team balancing using pairwise optimization
 */
function balanceTwoTeamsOptimal(
  players: KKPlayer[],
  teamSize: number,
  currentTeamSizes: number[]
): { teams: number[][]; balance: number; iterations: number } {
  
  console.log('🎯 Using 2-team pairwise optimization');
  
  // Sort players by weight (descending)
  const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
  
  const teams: number[][] = [[], []];
  const teamWeights = [0, 0];
  const teamSizes = [...currentTeamSizes];
  
  // Pairwise assignment: strongest with weakest
  let frontIndex = 0;
  let backIndex = sortedPlayers.length - 1;
  let iterations = 0;
  
  while (frontIndex <= backIndex && (teamSizes[0] < teamSize || teamSizes[1] < teamSize)) {
    // Determine which team should get the stronger player
    const team0NeedsMore = teamSizes[0] < teamSize && (teamSizes[1] >= teamSize || teamWeights[0] <= teamWeights[1]);
    
    if (frontIndex === backIndex) {
      // Last player - assign to lighter team that has space
      const targetTeam = teamSizes[0] < teamSize && teamWeights[0] <= teamWeights[1] ? 0 : 1;
      if (teamSizes[targetTeam] < teamSize) {
        teams[targetTeam].push(sortedPlayers[frontIndex].index);
        teamWeights[targetTeam] += sortedPlayers[frontIndex].weight;
        teamSizes[targetTeam]++;
      }
      break;
    }
    
    // Assign pair to balance teams
    if (team0NeedsMore && teamSizes[0] < teamSize) {
      teams[0].push(sortedPlayers[frontIndex].index);
      teamWeights[0] += sortedPlayers[frontIndex].weight;
      teamSizes[0]++;
      frontIndex++;
      
      if (teamSizes[1] < teamSize && backIndex >= frontIndex) {
        teams[1].push(sortedPlayers[backIndex].index);
        teamWeights[1] += sortedPlayers[backIndex].weight;
        teamSizes[1]++;
        backIndex--;
      }
    } else if (teamSizes[1] < teamSize) {
      teams[1].push(sortedPlayers[frontIndex].index);
      teamWeights[1] += sortedPlayers[frontIndex].weight;
      teamSizes[1]++;
      frontIndex++;
      
      if (teamSizes[0] < teamSize && backIndex >= frontIndex) {
        teams[0].push(sortedPlayers[backIndex].index);
        teamWeights[0] += sortedPlayers[backIndex].weight;
        teamSizes[0]++;
        backIndex--;
      }
    } else {
      break; // Both teams full
    }
    
    iterations++;
  }
  
  const balance = Math.abs(teamWeights[0] - teamWeights[1]);
  
  return { teams, balance, iterations };
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
 * Validate team composition constraints
 */
export function validateConstraints(
  teams: any[][],
  config: ConstraintConfig
): { isValid: boolean; violations: string[] } {
  
  const violations: string[] = [];
  
  // Check team sizes
  teams.forEach((team, index) => {
    if (team.length === 0) {
      violations.push(`Team ${index + 1} is empty`);
    }
  });
  
  // Check elite distribution if enforced
  if (config.maxElitePerTeam > 0) {
    teams.forEach((team, index) => {
      const eliteCount = team.filter(player => player.isElite).length;
      if (eliteCount > config.maxElitePerTeam) {
        violations.push(`Team ${index + 1} has ${eliteCount} elite players (max: ${config.maxElitePerTeam})`);
      }
    });
  }
  
  return {
    isValid: violations.length === 0,
    violations
  };
}