/**
 * Karmarkar-Karp Number Partitioning Algorithm
 * Efficiently partitions players into balanced teams using a constraint-first approach
 */

export interface KKPartitionResult {
  teams: number[][]; // Team indices for each team
  balance: number;   // Final balance score
  iterations: number;
}

export interface KKPlayer {
  index: number;
  weight: number;
  constraints?: {
    maxElitePerTeam?: number;
    isElite?: boolean;
  };
}

/**
 * Karmarkar-Karp algorithm for balanced team partitioning
 * Time complexity: O(n log n) vs O(n^t) for combinatorial
 */
export function karmarkarKarpPartition(
  players: KKPlayer[],
  numTeams: number,
  teamSize: number,
  maxIterations: number = 1000
): KKPartitionResult {
  
  if (players.length === 0) {
    return {
      teams: Array(numTeams).fill(null).map(() => []),
      balance: 0,
      iterations: 0
    };
  }

  // Initialize teams
  const teams: number[][] = Array(numTeams).fill(null).map(() => []);
  const teamWeights = new Array(numTeams).fill(0);
  const teamSizes = new Array(numTeams).fill(0);
  
  // Sort players by weight (descending) for greedy initial assignment
  const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
  
  let iterations = 0;
  
  // Phase 1: Constraint-first assignment
  for (const player of sortedPlayers) {
    // Find available teams (with capacity)
    const availableTeams = [];
    for (let i = 0; i < numTeams; i++) {
      if (teamSizes[i] < teamSize) {
        availableTeams.push(i);
      }
    }
    
    if (availableTeams.length === 0) {
      console.error(`🚨 KK ERROR: No available teams for player ${player.index}`);
      // This should never happen with proper capacity planning
      break;
    }
    
    // Among available teams, pick the one with lowest weight
    let bestTeam = availableTeams[0];
    let minWeight = teamWeights[availableTeams[0]];
    
    for (const teamIndex of availableTeams) {
      if (teamWeights[teamIndex] < minWeight) {
        minWeight = teamWeights[teamIndex];
        bestTeam = teamIndex;
      }
    }
    
    // Assign player to best team
    teams[bestTeam].push(player.index);
    teamWeights[bestTeam] += player.weight;
    teamSizes[bestTeam]++;
    iterations++;
  }
  
  // Phase 2: Local optimization using Karmarkar-Karp principle
  let improved = true;
  const maxOptimizationIterations = Math.min(maxIterations - iterations, 100);
  
  for (let iter = 0; iter < maxOptimizationIterations && improved; iter++) {
    improved = false;
    iterations++;
    
    // Find the most imbalanced pair of teams
    let maxDiff = 0;
    let heavyTeam = -1;
    let lightTeam = -1;
    
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        const diff = Math.abs(teamWeights[i] - teamWeights[j]);
        if (diff > maxDiff) {
          maxDiff = diff;
          if (teamWeights[i] > teamWeights[j]) {
            heavyTeam = i;
            lightTeam = j;
          } else {
            heavyTeam = j;
            lightTeam = i;
          }
        }
      }
    }
    
    if (heavyTeam === -1 || maxDiff < 0.1) break; // Already balanced
    
    // Try to find beneficial swaps between heavy and light teams
    for (let heavyPlayerIdx = 0; heavyPlayerIdx < teams[heavyTeam].length; heavyPlayerIdx++) {
      const heavyPlayerIndex = teams[heavyTeam][heavyPlayerIdx];
      const heavyPlayer = players.find(p => p.index === heavyPlayerIndex);
      if (!heavyPlayer) continue;
      
      for (let lightPlayerIdx = 0; lightPlayerIdx < teams[lightTeam].length; lightPlayerIdx++) {
        const lightPlayerIndex = teams[lightTeam][lightPlayerIdx];
        const lightPlayer = players.find(p => p.index === lightPlayerIndex);
        if (!lightPlayer) continue;
        
        // Calculate improvement from swap
        const currentDiff = Math.abs(teamWeights[heavyTeam] - teamWeights[lightTeam]);
        const newHeavyWeight = teamWeights[heavyTeam] - heavyPlayer.weight + lightPlayer.weight;
        const newLightWeight = teamWeights[lightTeam] - lightPlayer.weight + heavyPlayer.weight;
        const newDiff = Math.abs(newHeavyWeight - newLightWeight);
        
        if (newDiff < currentDiff - 0.1) { // Meaningful improvement
          // Perform swap
          teams[heavyTeam][heavyPlayerIdx] = lightPlayerIndex;
          teams[lightTeam][lightPlayerIdx] = heavyPlayerIndex;
          teamWeights[heavyTeam] = newHeavyWeight;
          teamWeights[lightTeam] = newLightWeight;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  
  // Calculate final balance
  const avgWeight = teamWeights.reduce((sum, w) => sum + w, 0) / numTeams;
  const variance = teamWeights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / numTeams;
  const balance = Math.sqrt(variance);
  
  return {
    teams,
    balance,
    iterations
  };
}

/**
 * Enhanced KK with elite distribution constraints
 */
export function constrainedKarmarkarKarp(
  players: KKPlayer[],
  numTeams: number,
  teamSize: number,
  maxElitePerTeam: number = 2
): KKPartitionResult {
  
  // Separate elite and regular players
  const elitePlayers = players.filter(p => p.constraints?.isElite);
  const regularPlayers = players.filter(p => !p.constraints?.isElite);
  
  // Initialize teams
  const teams: number[][] = Array(numTeams).fill(null).map(() => []);
  const teamWeights = new Array(numTeams).fill(0);
  const teamSizes = new Array(numTeams).fill(0);
  const teamEliteCounts = new Array(numTeams).fill(0);
  
  let iterations = 0;
  
  // Phase 1: Distribute elite players first (hard constraint)
  elitePlayers.sort((a, b) => b.weight - a.weight);
  
  for (const player of elitePlayers) {
    // Find teams that can accept another elite player
    const availableTeams = [];
    for (let i = 0; i < numTeams; i++) {
      if (teamSizes[i] < teamSize && teamEliteCounts[i] < maxElitePerTeam) {
        availableTeams.push(i);
      }
    }
    
    if (availableTeams.length === 0) {
      console.warn(`⚠️ Cannot assign elite player ${player.index} without violating constraints`);
      continue;
    }
    
    // Assign to lightest available team
    let bestTeam = availableTeams[0];
    let minWeight = teamWeights[availableTeams[0]];
    
    for (const teamIndex of availableTeams) {
      if (teamWeights[teamIndex] < minWeight) {
        minWeight = teamWeights[teamIndex];
        bestTeam = teamIndex;
      }
    }
    
    teams[bestTeam].push(player.index);
    teamWeights[bestTeam] += player.weight;
    teamSizes[bestTeam]++;
    teamEliteCounts[bestTeam]++;
    iterations++;
  }
  
  // Phase 2: Distribute regular players using KK
  const regularResult = karmarkarKarpPartition(
    regularPlayers.map(p => ({ ...p, constraints: undefined })),
    numTeams,
    teamSize,
    1000 - iterations
  );
  
  // Merge results
  for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
    for (const playerIndex of regularResult.teams[teamIndex]) {
      if (teamSizes[teamIndex] < teamSize) {
        teams[teamIndex].push(playerIndex);
        teamWeights[teamIndex] += regularPlayers[playerIndex].weight;
        teamSizes[teamIndex]++;
      }
    }
  }
  
  // Final balance calculation
  const avgWeight = teamWeights.reduce((sum, w) => sum + w, 0) / numTeams;
  const variance = teamWeights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / numTeams;
  const balance = Math.sqrt(variance);
  
  return {
    teams,
    balance,
    iterations: iterations + regularResult.iterations
  };
}