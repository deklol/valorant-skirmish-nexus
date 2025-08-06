/**
 * Streaming Team Assignment System
 * Progressive player assignment with real-time balance monitoring
 */

export interface StreamingPlayer {
  id: string;
  discord_username: string;
  evidenceWeight: number;
  isElite?: boolean;
  constraints?: {
    preferredTeammates?: string[];
    avoidTeammates?: string[];
  };
}

export interface StreamingTeam {
  index: number;
  players: StreamingPlayer[];
  totalWeight: number;
  eliteCount: number;
  capacity: number;
}

export interface StreamingStep {
  playerAssigned: string;
  teamIndex: number;
  reasoning: string;
  balanceScore: number;
  timestamp: number;
}

export interface StreamingResult {
  teams: StreamingTeam[];
  steps: StreamingStep[];
  finalBalance: number;
  isOptimal: boolean;
  terminatedEarly: boolean;
}

export interface StreamingConfig {
  maxElitePerTeam: number;
  balanceThreshold: number; // Early termination threshold
  enableEarlyTermination: boolean;
  progressCallback?: (step: StreamingStep, progress: number) => void;
}

/**
 * Streaming assignment with real-time progress
 */
export async function streamingTeamAssignment(
  players: StreamingPlayer[],
  numTeams: number,
  teamSize: number,
  config: StreamingConfig
): Promise<StreamingResult> {
  
  console.log(`🌊 Streaming Assignment: ${players.length} players → ${numTeams} teams`);
  
  // Initialize teams
  const teams: StreamingTeam[] = Array(numTeams).fill(null).map((_, index) => ({
    index,
    players: [],
    totalWeight: 0,
    eliteCount: 0,
    capacity: teamSize
  }));
  
  const steps: StreamingStep[] = [];
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
  
  let isOptimal = true;
  let terminatedEarly = false;
  
  // Process each player with streaming assignment
  for (let playerIndex = 0; playerIndex < sortedPlayers.length; playerIndex++) {
    const player = sortedPlayers[playerIndex];
    const progress = (playerIndex + 1) / sortedPlayers.length;
    
    // Find optimal team for this player
    const assignment = await findOptimalTeamStreaming(player, teams, config);
    
    if (assignment.teamIndex === -1) {
      console.warn(`⚠️ Cannot assign player ${player.discord_username}`);
      isOptimal = false;
      continue;
    }
    
    // Assign player to team
    const targetTeam = teams[assignment.teamIndex];
    targetTeam.players.push(player);
    targetTeam.totalWeight += player.evidenceWeight;
    if (player.isElite) targetTeam.eliteCount++;
    
    // Record step
    const step: StreamingStep = {
      playerAssigned: player.discord_username,
      teamIndex: assignment.teamIndex,
      reasoning: assignment.reasoning,
      balanceScore: calculateCurrentBalance(teams),
      timestamp: Date.now()
    };
    
    steps.push(step);
    
    // Progress callback
    if (config.progressCallback) {
      config.progressCallback(step, progress);
    }
    
    // Early termination check
    if (config.enableEarlyTermination && step.balanceScore <= config.balanceThreshold) {
      // Check if remaining players can maintain balance
      const remainingPlayers = sortedPlayers.slice(playerIndex + 1);
      if (canMaintainBalance(teams, remainingPlayers, config.balanceThreshold)) {
        console.log(`✅ Early termination: Optimal balance achieved`);
        terminatedEarly = true;
        
        // Assign remaining players quickly
        await assignRemainingPlayersQuick(remainingPlayers, teams, steps, config);
        break;
      }
    }
    
    // Add small delay for streaming effect (remove in production)
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const finalBalance = calculateCurrentBalance(teams);
  
  return {
    teams,
    steps,
    finalBalance,
    isOptimal,
    terminatedEarly
  };
}

/**
 * Find optimal team for a player with streaming constraints
 */
async function findOptimalTeamStreaming(
  player: StreamingPlayer,
  teams: StreamingTeam[],
  config: StreamingConfig
): Promise<{ teamIndex: number; reasoning: string }> {
  
  // Find teams with available capacity
  const availableTeams = teams.filter(team => team.players.length < team.capacity);
  
  if (availableTeams.length === 0) {
    return { teamIndex: -1, reasoning: 'No available teams' };
  }
  
  // Filter by elite constraints
  let validTeams = availableTeams;
  if (player.isElite) {
    validTeams = availableTeams.filter(team => team.eliteCount < config.maxElitePerTeam);
    if (validTeams.length === 0) {
      return { teamIndex: -1, reasoning: 'Elite distribution constraint violated' };
    }
  }
  
  // Find team that minimizes balance disruption
  let bestTeam = validTeams[0];
  let bestScore = Infinity;
  let bestReasoning = 'Default assignment';
  
  for (const team of validTeams) {
    // Simulate assignment
    const simulatedBalance = calculateSimulatedBalance(teams, team.index, player);
    
    // Prefer teams with lower weight (better balance)
    const score = simulatedBalance + (team.totalWeight * 0.1); // Small preference for lighter teams
    
    if (score < bestScore) {
      bestScore = score;
      bestTeam = team;
      bestReasoning = `Optimal balance (score: ${simulatedBalance.toFixed(1)})`;
    }
  }
  
  return { teamIndex: bestTeam.index, reasoning: bestReasoning };
}

/**
 * Calculate current balance across all teams
 */
function calculateCurrentBalance(teams: StreamingTeam[]): number {
  const weights = teams.map(team => team.totalWeight);
  const avg = weights.reduce((sum, w) => sum + w, 0) / weights.length;
  const variance = weights.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / weights.length;
  return Math.sqrt(variance);
}

/**
 * Calculate simulated balance after assigning player to team
 */
function calculateSimulatedBalance(teams: StreamingTeam[], teamIndex: number, player: StreamingPlayer): number {
  const simulatedWeights = teams.map((team, index) => 
    index === teamIndex ? team.totalWeight + player.evidenceWeight : team.totalWeight
  );
  
  const avg = simulatedWeights.reduce((sum, w) => sum + w, 0) / simulatedWeights.length;
  const variance = simulatedWeights.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / simulatedWeights.length;
  return Math.sqrt(variance);
}

/**
 * Check if remaining players can maintain current balance
 */
function canMaintainBalance(
  teams: StreamingTeam[],
  remainingPlayers: StreamingPlayer[],
  threshold: number
): boolean {
  
  if (remainingPlayers.length === 0) return true;
  
  // Simple heuristic: check if remaining players can be distributed evenly
  const totalRemainingWeight = remainingPlayers.reduce((sum, p) => sum + p.evidenceWeight, 0);
  const teamsWithCapacity = teams.filter(team => team.players.length < team.capacity);
  
  if (teamsWithCapacity.length === 0) return false;
  
  const avgRemainingWeight = totalRemainingWeight / teamsWithCapacity.length;
  
  // Check if this would maintain balance within threshold
  return avgRemainingWeight <= threshold;
}

/**
 * Quickly assign remaining players after early termination
 */
async function assignRemainingPlayersQuick(
  remainingPlayers: StreamingPlayer[],
  teams: StreamingTeam[],
  steps: StreamingStep[],
  config: StreamingConfig
): Promise<void> {
  
  for (const player of remainingPlayers) {
    const assignment = await findOptimalTeamStreaming(player, teams, config);
    
    if (assignment.teamIndex !== -1) {
      const targetTeam = teams[assignment.teamIndex];
      targetTeam.players.push(player);
      targetTeam.totalWeight += player.evidenceWeight;
      if (player.isElite) targetTeam.eliteCount++;
      
      steps.push({
        playerAssigned: player.discord_username,
        teamIndex: assignment.teamIndex,
        reasoning: `Quick assignment (early termination)`,
        balanceScore: calculateCurrentBalance(teams),
        timestamp: Date.now()
      });
    }
  }
}

/**
 * Progressive assignment with UI updates
 */
export class StreamingBalancer {
  private config: StreamingConfig;
  private isRunning: boolean = false;
  
  constructor(config: StreamingConfig) {
    this.config = config;
  }
  
  async assignWithProgress(
    players: StreamingPlayer[],
    numTeams: number,
    teamSize: number,
    onProgress?: (step: StreamingStep, progress: number) => void
  ): Promise<StreamingResult> {
    
    if (this.isRunning) {
      throw new Error('Assignment already in progress');
    }
    
    this.isRunning = true;
    
    try {
      const configWithCallback = {
        ...this.config,
        progressCallback: onProgress
      };
      
      const result = await streamingTeamAssignment(players, numTeams, teamSize, configWithCallback);
      return result;
    } finally {
      this.isRunning = false;
    }
  }
  
  isAssigning(): boolean {
    return this.isRunning;
  }
}