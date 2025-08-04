/**
 * Streamlined ATLAS Team Assignment System
 * Linear, predictable team balancing with smart anti-stacking
 */

import { getPlayerWeight, type ATLASWeightResult, type ATLASConfig } from "@/utils/atlasWeightCalculator";

export interface StreamlinedPlayer {
  id: string;
  discord_username: string;
  current_rank: string;
  rank_points: number;
  weight_rating: number;
  peak_rank?: string;
  riot_id?: string;
  manual_rank_override?: string | null;
  manual_weight_override?: number | null;
  use_manual_override?: boolean;
  rank_override_reason?: string | null;
  tournaments_won?: number;
  last_tournament_win?: string;
}

export interface StreamlinedTeam {
  id: string;
  name: string;
  members: StreamlinedPlayer[];
  totalWeight: number;
  eliteCount: number; // Track elite players for anti-stacking
}

export interface StreamlinedAssignmentStep {
  step: number;
  action: string;
  player: string;
  assignedTo: string;
  reasoning: string;
  teamTotals: Record<string, number>;
}

export interface StreamlinedResult {
  teams: StreamlinedTeam[];
  steps: StreamlinedAssignmentStep[];
  summary: {
    totalPlayers: number;
    averageTeamWeight: number;
    weightSpread: number;
    eliteDistribution: Record<string, number>;
  };
}

/**
 * Main ATLAS team assignment function
 * Linear logic: Elite distribution → Regular assignment → Final teams
 */
export const assignTeamsWithATLAS = async (
  players: StreamlinedPlayer[],
  teamCount: number,
  config: Partial<ATLASConfig> = {}
): Promise<StreamlinedResult> => {
  const atlasConfig = { enableAtlas: true, eliteThreshold: 400, maxElitePerTeam: 1, ...config };
  
  // Step 1: Calculate all player weights
  const playersWithWeights = await Promise.all(
    players.map(async (player) => {
      const weightResult = await getPlayerWeight(player, atlasConfig);
      return {
        ...player,
        atlasWeight: weightResult.points,
        atlasSource: weightResult.source,
        atlasReasoning: weightResult.reasoning || '',
        isElite: weightResult.points >= atlasConfig.eliteThreshold
      };
    })
  );

  // Step 2: Initialize teams
  const teams: StreamlinedTeam[] = Array.from({ length: teamCount }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    members: [],
    totalWeight: 0,
    eliteCount: 0
  }));

  // Step 3: Separate elite and regular players
  const elitePlayers = playersWithWeights.filter(p => p.isElite);
  const regularPlayers = playersWithWeights.filter(p => !p.isElite);

  // Sort both groups by weight (highest first for fair distribution)
  elitePlayers.sort((a, b) => b.atlasWeight - a.atlasWeight);
  regularPlayers.sort((a, b) => b.atlasWeight - a.atlasWeight);

  const steps: StreamlinedAssignmentStep[] = [];
  let stepCounter = 1;

  // Step 4: Distribute elite players (round-robin to prevent stacking)
  elitePlayers.forEach((player, index) => {
    const targetTeamIndex = index % teamCount;
    const targetTeam = teams[targetTeamIndex];
    
    targetTeam.members.push(player);
    targetTeam.totalWeight += player.atlasWeight;
    targetTeam.eliteCount += 1;

    steps.push({
      step: stepCounter++,
      action: 'Elite Distribution',
      player: `${player.discord_username} (${player.atlasWeight}pts)`,
      assignedTo: targetTeam.name,
      reasoning: `Elite player assigned round-robin to prevent stacking`,
      teamTotals: Object.fromEntries(teams.map(t => [t.name, t.totalWeight]))
    });
  });

  // Step 5: Assign regular players to lowest weight team
  regularPlayers.forEach((player) => {
    // Find team with lowest total weight
    const lowestTeam = teams.reduce((prev, current) => 
      prev.totalWeight < current.totalWeight ? prev : current
    );
    
    lowestTeam.members.push(player);
    lowestTeam.totalWeight += player.atlasWeight;

    steps.push({
      step: stepCounter++,
      action: 'Balance Assignment',
      player: `${player.discord_username} (${player.atlasWeight}pts)`,
      assignedTo: lowestTeam.name,
      reasoning: `Assigned to lowest weight team (${lowestTeam.totalWeight - player.atlasWeight} → ${lowestTeam.totalWeight})`,
      teamTotals: Object.fromEntries(teams.map(t => [t.name, t.totalWeight]))
    });
  });

  // Step 6: Generate summary
  const totalWeight = teams.reduce((sum, team) => sum + team.totalWeight, 0);
  const averageWeight = totalWeight / teamCount;
  const weightSpread = Math.max(...teams.map(t => t.totalWeight)) - Math.min(...teams.map(t => t.totalWeight));
  const eliteDistribution = Object.fromEntries(
    teams.map(team => [team.name, team.eliteCount])
  );

  return {
    teams,
    steps,
    summary: {
      totalPlayers: players.length,
      averageTeamWeight: Math.round(averageWeight),
      weightSpread: Math.round(weightSpread),
      eliteDistribution
    }
  };
};

/**
 * Validate team balance quality
 */
export const validateTeamBalance = (result: StreamlinedResult): {
  score: number;
  issues: string[];
  recommendations: string[];
} => {
  const { teams, summary } = result;
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check weight spread (lower is better)
  const spreadPercent = (summary.weightSpread / summary.averageTeamWeight) * 100;
  
  // Check elite distribution
  const maxEliteInTeam = Math.max(...Object.values(summary.eliteDistribution));
  const hasEliteStacking = maxEliteInTeam > 1;
  
  if (spreadPercent > 15) {
    issues.push(`High weight spread: ${Math.round(spreadPercent)}%`);
    recommendations.push('Consider rebalancing teams');
  }
  
  if (hasEliteStacking) {
    issues.push(`Elite stacking detected: ${maxEliteInTeam} elite players in one team`);
    recommendations.push('Redistribute elite players across teams');
  }
  
  // Calculate quality score (0-100)
  let score = 100;
  score -= Math.min(spreadPercent, 30); // Penalty for spread
  score -= hasEliteStacking ? 25 : 0; // Penalty for elite stacking
  
  return {
    score: Math.max(0, Math.round(score)),
    issues,
    recommendations
  };
};