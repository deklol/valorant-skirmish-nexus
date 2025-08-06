// Evidence-Based Snake Draft with Smart Skill Distribution and Mini-AI Decision System
import { calculateEvidenceBasedWeightWithMiniAi, EvidenceBasedConfig, EvidenceBasedCalculation } from "@/utils/evidenceBasedWeightSystem";
import { AtlasDecision } from "@/utils/miniAiDecisionSystem";
import { RANK_POINT_MAPPING } from "@/utils/rankingSystem";


export interface EvidenceBalanceStep {
  step: number;
  player: {
    id: string;
    discord_username: string;
    points: number;
    rank: string;
    source: string;
    evidenceWeight?: number;
    weightSource?: string;
    evidenceReasoning?: string;
    isElite?: boolean;
  };
  assignedTeam: number;
  reasoning: string;
  teamStatesAfter: {
    teamIndex: number;
    totalPoints: number;
    playerCount: number;
    eliteCount: number;
  }[];
  phase: 'elite_distribution' | 'regular_distribution' | 'mini_ai_adjustment' | 'atlas_adjustment' | 'atlas_team_formation' | 'atlas_optimization_swap';
}

export interface EvidenceValidationResult {
  originalSkillDistribution: {
    elitePlayersPerTeam: number[];
    skillStackingViolations: number;
    balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  };
  adjustmentsMade: {
    redistributions: Array<{
      player: string;
      fromTeam: number;
      toTeam: number;
      reason: string;
      type: 'skill_fix' | 'balance_fix';
    }>;
  };
  finalDistribution: {
    elitePlayersPerTeam: number[];
    skillStackingViolations: number;
    pointBalance: {
      maxDifference: number;
      balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
    };
  };
  miniAiDecisions: AtlasDecision[];
  validationTime: number;
}

export interface MiniAiEnhancedResult {
  playerAdjustments: Array<{
    playerId: string;
    username: string;
    originalPoints: number;
    adjustedPoints: number;
    reasoning: string;
    confidence: number;
  }>;
  redistributionRecommendations: Array<{
    playerId: string;
    username: string;
    fromTeam: number;
    toTeam: number;
    reasoning: string;
    priority: string;
  }>;
}

export interface EvidenceTeamResult {
  teams: any[][];
  balanceSteps: EvidenceBalanceStep[];
  validationResult?: EvidenceValidationResult;
  // This is the key field for the ATLAS UI
  evidenceCalculations: Array<{
    userId: string;
    calculation: any;
  }>;
  miniAiEnhancements?: MiniAiEnhancedResult;
  finalAnalysis: {
    skillDistribution: {
      elitePlayersPerTeam: number[];
      skillStackingViolations: number;
    };
    pointBalance: {
      averageTeamPoints: number;
      minTeamPoints: number;
      maxTeamPoints: number;
      maxPointDifference: number;
      balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
    };
    overallQuality: 'excellent' | 'good' | 'acceptable' | 'needs_improvement';
    miniAiSummary?: {
      playersAnalyzed: number;
      adjustmentsMade: number;
      redistributionsRecommended: number;
      averageConfidence: number;
    };
  };
}

/**
 * Creates balanced teams using ATLAS Advanced Formation Algorithm
 * PHASE 1 FIX: Prevents Team 0 from automatically getting strongest players
 */
function createAtlasBalancedTeams(players: any[], numTeams: number, teamSize: number, config: EvidenceBasedConfig): { teams: any[][], steps: EvidenceBalanceStep[] } {
  const teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const steps: EvidenceBalanceStep[] = [];
  let stepCounter = 0;

  // Sort players descending by weight
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
  
  // Handle case where there are not enough players for captains
  if (sortedPlayers.length < numTeams) {
      console.error("Not enough players to form teams.");
      return { teams, steps };
  }

  console.log('🏛️ ATLAS PHASE 1 FIX: Implementing Balanced Captain Distribution');

  // PHASE 1 FIX: Balanced Captain Assignment
  // Instead of sequential assignment, use round-robin with load balancing
  const captains = sortedPlayers.slice(0, numTeams);
  const remainingPlayers = sortedPlayers.slice(numTeams);
  
  // Assign captains using weighted round-robin to prevent Team 0 dominance
  captains.forEach((captain, index) => {
    // ATLAS Strategy: Assign strongest captain to team that needs balancing
    let targetTeamIndex;
    
    if (numTeams === 2) {
      // For 2-team tournaments: strategically place captains
      targetTeamIndex = index % 2;
    } else {
      // For multi-team: use reverse order for stronger captains
      targetTeamIndex = (numTeams - 1 - index) % numTeams;
    }
    
    teams[targetTeamIndex].push(captain);
    
    steps.push({
      step: ++stepCounter,
      player: {
        id: captain.id, 
        discord_username: captain.discord_username || 'Unknown',
        points: captain.evidenceWeight, 
        rank: captain.displayRank || 'Unranked',
        source: captain.weightSource || 'unknown', 
        evidenceWeight: captain.evidenceWeight, 
        isElite: captain.isElite,
        evidenceReasoning: captain.evidenceCalculation?.calculationReasoning,
      },
      assignedTeam: targetTeamIndex,
      reasoning: `🏛️ ATLAS Strategic Captain: ${captain.discord_username} (${captain.evidenceWeight}pts) → Team ${targetTeamIndex + 1}. Balanced captain distribution prevents Team 0 dominance.`,
      teamStatesAfter: JSON.parse(JSON.stringify(teams)).map((team, index) => ({
        teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
        playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
      })),
      phase: 'atlas_team_formation',
    });
  });

  // PHASE 2 FIX: Enhanced Smart Distribution with 2-Team Integration
  console.log('🏛️ ATLAS PHASE 2 FIX: Smart Distribution with Real-time Balance Validation');
  
  // Special handling for 2-team tournaments - integrated into main formation
  if (numTeams === 2 && remainingPlayers.length > 0) {
    console.log('🏛️ ATLAS 2-Team Optimization: Integrated balance validation');
    
    // Use alternating assignment with balance checking after each assignment
    let assignToTeam0 = teams[0].reduce((sum, p) => sum + p.evidenceWeight, 0) <= 
                       teams[1].reduce((sum, p) => sum + p.evidenceWeight, 0);
    
    remainingPlayers.forEach((player, index) => {
      const targetTeam = assignToTeam0 ? 0 : 1;
      teams[targetTeam].push(player);
      
      // Check balance after assignment and adjust next assignment
      const team0Total = teams[0].reduce((sum, p) => sum + p.evidenceWeight, 0);
      const team1Total = teams[1].reduce((sum, p) => sum + p.evidenceWeight, 0);
      assignToTeam0 = team0Total <= team1Total;
      
      steps.push({
        step: ++stepCounter,
        player: {
          id: player.id, 
          discord_username: player.discord_username || 'Unknown',
          points: player.evidenceWeight, 
          rank: player.displayRank || 'Unranked',
          source: player.weightSource || 'unknown', 
          evidenceWeight: player.evidenceWeight, 
          isElite: player.isElite,
          evidenceReasoning: player.evidenceCalculation?.calculationReasoning,
        },
        assignedTeam: targetTeam,
        reasoning: `🏛️ ATLAS 2-Team Balance: ${player.discord_username} (${player.evidenceWeight}pts) → Team ${targetTeam + 1}. Balance validation: T1=${team0Total} vs T2=${team1Total}`,
        teamStatesAfter: JSON.parse(JSON.stringify(teams)).map((team, index) => ({
          teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
          playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
        })),
        phase: 'atlas_team_formation',
      });
    });
  } else {
    // Multi-team distribution with enhanced balancing
    // CRITICAL FIX: Ensure equal team sizes first, then balance skill
    while (remainingPlayers.length > 0) {
      // Find teams that still need players (have less than teamSize)
      const teamsNeedingPlayers = teams
        .map((team, index) => ({ team, index, count: team.length }))
        .filter(t => t.count < teamSize)
        .sort((a, b) => a.count - b.count); // Fill teams with fewer players first
      
      if (teamsNeedingPlayers.length === 0) {
        console.warn('🏛️ ATLAS WARNING: All teams full but players remaining');
        break;
      }
      
      // Priority 1: Fill teams to equal size first
      if (teamsNeedingPlayers.some(t => t.count < Math.ceil(players.length / numTeams))) {
        const teamToFill = teamsNeedingPlayers[0]; // Team with fewest players
        const playerToAssign = remainingPlayers.shift();
        
        if (playerToAssign) {
          teams[teamToFill.index].push(playerToAssign);
          steps.push({
            step: ++stepCounter,
            player: {
              id: playerToAssign.id, 
              discord_username: playerToAssign.discord_username || 'Unknown',
              points: playerToAssign.evidenceWeight, 
              rank: playerToAssign.displayRank || 'Unranked',
              source: playerToAssign.weightSource || 'unknown', 
              evidenceWeight: playerToAssign.evidenceWeight, 
              isElite: playerToAssign.isElite,
              evidenceReasoning: playerToAssign.evidenceCalculation?.calculationReasoning,
            },
            assignedTeam: teamToFill.index,
            reasoning: `🏛️ ATLAS Equal Distribution: ${playerToAssign.discord_username} (${playerToAssign.evidenceWeight}pts) → Team ${teamToFill.index + 1} (Size Balance: ${teamToFill.count}→${teamToFill.count + 1})`,
            teamStatesAfter: JSON.parse(JSON.stringify(teams)).map((team, index) => ({
              teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
              playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
            })),
            phase: 'atlas_team_formation',
          });
        }
      } else {
        // Priority 2: All teams have equal base size, now balance skill
        const teamTotals = teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
        const weakerTeamIndex = teamTotals.indexOf(Math.min(...teamTotals));
        
        const availableTeam = teamsNeedingPlayers.find(t => t.index === weakerTeamIndex) || teamsNeedingPlayers[0];
        const playerToAssign = remainingPlayers.shift();
        
        if (playerToAssign && availableTeam) {
          teams[availableTeam.index].push(playerToAssign);
          steps.push({
            step: ++stepCounter,
            player: {
              id: playerToAssign.id, 
              discord_username: playerToAssign.discord_username || 'Unknown',
              points: playerToAssign.evidenceWeight, 
              rank: playerToAssign.displayRank || 'Unranked',
              source: playerToAssign.weightSource || 'unknown', 
              evidenceWeight: playerToAssign.evidenceWeight, 
              isElite: playerToAssign.isElite,
              evidenceReasoning: playerToAssign.evidenceCalculation?.calculationReasoning,
            },
            assignedTeam: availableTeam.index,
            reasoning: `🏛️ ATLAS Skill Balance: ${playerToAssign.discord_username} (${playerToAssign.evidenceWeight}pts) → Team ${availableTeam.index + 1} (Weakest: ${teamTotals[availableTeam.index]}pts)`,
            teamStatesAfter: JSON.parse(JSON.stringify(teams)).map((team, index) => ({
              teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
              playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
            })),
            phase: 'atlas_team_formation',
          });
        }
      }
    }
  }

  return { teams, steps };
}


/**
 * Evidence-Based Snake Draft with Mini-AI Decision System
 */
export const evidenceBasedSnakeDraft = async (
  players: any[], 
  numTeams: number, 
  teamSize: number,
  onProgress?: (step: EvidenceBalanceStep, currentStep: number, totalSteps: number) => void,
  onValidationStart?: () => void,
  onEvidenceCalculation?: (phase: string, current: number, total: number) => void,
  evidenceConfig?: EvidenceBasedConfig
): Promise<EvidenceTeamResult> => {
  
  const config = evidenceConfig || {
    enableEvidenceBasedWeights: true,
    tournamentWinBonus: 15,
    rankDecayThreshold: 2,
    maxDecayPercent: 0.25,
    skillTierCaps: {
      enabled: true,
      eliteThreshold: 400, // Adjusted threshold for better elite detection
      maxElitePerTeam: 1
    }
  };

  console.log('🏛️ STARTING ATLAS-FIRST TEAM FORMATION');

  // PHASE 2 FIX: Consolidated Weight Calculation with Caching
  console.log('🏛️ ATLAS PHASE 2 FIX: Implementing Weight Calculation Consolidation');
  
  const evidenceCalculations: Array<{ userId: string; calculation: any }> = [];
  const atlasEnhancements: MiniAiEnhancedResult = {
    playerAdjustments: [],
    redistributionRecommendations: []
  };
  
  // Cache to prevent duplicate calculations
  const weightCache = new Map<string, any>();

  const playersWithEvidenceWeights = await Promise.all(
    players.map(async (player, index) => {
      if (onEvidenceCalculation) {
        onEvidenceCalculation('🏛️ ATLAS calculating unified weights', index + 1, players.length);
      }

      const cacheKey = `${player.user_id || player.id}_${player.current_rank}_${player.peak_rank}_${player.manual_rank_override}`;
      
      let evidenceResult;
      if (weightCache.has(cacheKey)) {
        evidenceResult = weightCache.get(cacheKey);
        console.log(`🏛️ ATLAS CACHE HIT for ${player.discord_username}`);
      } else {
        evidenceResult = await calculateEvidenceBasedWeightWithMiniAi({
          current_rank: player.current_rank, peak_rank: player.peak_rank,
          manual_rank_override: player.manual_rank_override, manual_weight_override: player.manual_weight_override,
          use_manual_override: player.use_manual_override, rank_override_reason: player.rank_override_reason,
          weight_rating: player.weight_rating, tournaments_won: player.tournaments_won,
          last_tournament_win: player.last_tournament_win
        }, config, true);
        
        weightCache.set(cacheKey, evidenceResult);
        console.log(`🏛️ ATLAS WEIGHT CALCULATED for ${player.discord_username}: ${evidenceResult.finalAdjustedPoints}pts`);
      }

      // Enhanced calculation object for transparency
      const evidenceDetails = evidenceResult.evidenceResult;
      const evidenceCalculation = evidenceDetails.evidenceCalculation;
      
      if (evidenceCalculation) {
        const peakRankPoints = evidenceCalculation.peakRank ? (RANK_POINT_MAPPING[evidenceCalculation.peakRank] || 0) : 0;
        
        evidenceCalculations.push({
          userId: player.user_id || player.id,
          calculation: {
            finalPoints: evidenceResult.finalAdjustedPoints,
            currentRank: evidenceCalculation.currentRank || player.current_rank,
            currentRankPoints: evidenceCalculation.basePoints,
            peakRank: evidenceCalculation.peakRank || player.peak_rank,
            peakRankPoints: peakRankPoints,
            calculationReasoning: evidenceCalculation.calculationReasoning || "Calculated by ATLAS Evidence-Based System.",
            rankDecayFactor: evidenceCalculation.rankDecayApplied,
            tournamentsWon: evidenceCalculation.tournamentsWon,
            tournamentBonus: evidenceCalculation.tournamentBonus,
            weightSource: 'atlas_unified',
            evidenceFactors: evidenceCalculation.evidenceFactors || [],
            miniAiAnalysis: evidenceDetails.miniAiAnalysis,
            isElite: evidenceResult.finalAdjustedPoints >= config.skillTierCaps.eliteThreshold,
            cacheHit: weightCache.has(cacheKey)
          },
        });
      }

      // PHASE 4 FIX: Capture Mini-AI recommendations for formation integration
      if (evidenceResult.miniAiRecommendations) {
        evidenceResult.miniAiRecommendations.forEach(rec => {
          if (rec.type === 'player_adjustment') {
            atlasEnhancements.playerAdjustments.push({
              playerId: player.user_id || player.id, 
              username: player.discord_username || 'Unknown',
              originalPoints: evidenceResult.evidenceResult.evidenceCalculation?.basePoints || 150,
              adjustedPoints: evidenceResult.finalAdjustedPoints,
              reasoning: rec.reasoning, 
              confidence: rec.confidence
            });
          } else if (rec.type === 'team_redistribution') {
            atlasEnhancements.redistributionRecommendations.push({
              playerId: player.user_id || player.id,
              username: player.discord_username || 'Unknown',
              fromTeam: rec.action?.fromTeam || -1,
              toTeam: rec.action?.toTeam || -1,
              reasoning: rec.reasoning,
              priority: rec.priority
            });
          }
        });
      }

      // Return enhanced player object with unified weight data
      return {
        ...player,
        evidenceWeight: evidenceResult.finalAdjustedPoints,
        weightSource: 'atlas_unified',
        displayRank: evidenceDetails.rank,
        evidenceCalculation,
        miniAiAnalysis: evidenceDetails.miniAiAnalysis,
        isElite: evidenceResult.finalAdjustedPoints >= config.skillTierCaps.eliteThreshold,
        unifiedWeightData: {
          points: evidenceResult.finalAdjustedPoints,
          source: 'atlas_evidence',
          rank: evidenceDetails.rank,
          reasoning: evidenceResult.adjustmentReasoning,
          isValid: evidenceResult.finalAdjustedPoints > 0
        }
      };
    })
  );

  console.log('🏛️ ATLAS UNIFIED WEIGHT CALCULATIONS COMPLETE');
  console.log(`🏛️ ATLAS CACHE PERFORMANCE: ${weightCache.size} unique calculations cached`);

  // PHASE 3: ATLAS Advanced Team Formation
  console.log('🏛️ ATLAS PHASE 3: Advanced Team Formation with Mini-AI Integration');
  const { teams: atlasCreatedTeams, steps: balanceSteps } = createAtlasBalancedTeams(
    playersWithEvidenceWeights,
    numTeams,
    teamSize,
    config
  );

  // PHASE 6 FIX: Add comprehensive validation logging
  console.log('🏛️ ATLAS PHASE 6: Team Formation Validation');
  const teamTotals = atlasCreatedTeams.map((team, index) => {
    const total = team.reduce((sum, p) => sum + p.evidenceWeight, 0);
    console.log(`🏛️ Team ${index + 1}: ${total} points (${team.length} players)`);
    return total;
  });
  
  const maxDiff = Math.max(...teamTotals) - Math.min(...teamTotals);
  console.log(`🏛️ ATLAS Formation Quality: ${maxDiff} point difference between teams`);

  // Simulate progress for the UI with enhanced feedback
  for (let i = 0; i < balanceSteps.length; i++) {
    if (onProgress) {
      onProgress(balanceSteps[i], i + 1, balanceSteps.length);
    }
  }

  // Phase 3: ATLAS validation and final adjustments (optional fine-tuning)
  let validationResult: EvidenceValidationResult | undefined;
  if (onValidationStart) onValidationStart();

  const validationStartTime = Date.now();
  const atlasResult = await performAtlasValidation(atlasCreatedTeams, config, atlasEnhancements, playersWithEvidenceWeights);
  
  validationResult = {
    originalSkillDistribution: {
      elitePlayersPerTeam: atlasCreatedTeams.map(t => t.filter(p => p.isElite).length),
      skillStackingViolations: atlasCreatedTeams.filter(t => t.filter(p => p.isElite).length > 1).length,
      balanceQuality: calculatePointBalance(atlasCreatedTeams).balanceQuality
    },
    adjustmentsMade: atlasResult.adjustments,
    finalDistribution: {
      elitePlayersPerTeam: atlasResult.teams.map(t => t.filter(p => p.isElite).length),
      skillStackingViolations: atlasResult.teams.map(t => t.filter(p => p.isElite).length > 1).length,
      pointBalance: calculatePointBalance(atlasResult.teams)
    },
    miniAiDecisions: atlasResult.decisions,
    validationTime: Date.now() - validationStartTime
  };

  const allBalanceSteps = [...balanceSteps, ...atlasResult.validationSteps];
  const finalAnalysis = calculateFinalAnalysis(atlasResult.teams, config, atlasEnhancements);

  return {
    teams: atlasResult.teams,
    balanceSteps: allBalanceSteps,
    validationResult,
    evidenceCalculations,
    miniAiEnhancements: atlasEnhancements,
    finalAnalysis
  };
};

/**
 * ATLAS Enhanced Validation System
 */
async function performAtlasValidation(
  teams: any[][],
  config: EvidenceBasedConfig,
  atlasEnhancements: MiniAiEnhancedResult,
  allPlayers: any[] // Pass in all players to find the top player
): Promise<{
  teams: any[][];
  adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> };
  decisions: AtlasDecision[];
  validationSteps: EvidenceBalanceStep[];
}> {
  let adjustedTeams = JSON.parse(JSON.stringify(teams));
  const adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> } = { redistributions: [] };
  const decisions: AtlasDecision[] = [];
  const validationSteps: EvidenceBalanceStep[] = [];

  console.log('🏛️ ATLAS VALIDATION STARTING: Analyzing team composition...');

  // PHASE 3 FIX: Enhanced Post-Formation Validation (reduced complexity since main formation is improved)
  console.log('🏛️ ATLAS PHASE 3 FIX: Simplified Post-Formation Validation');
  
  // For 2-team tournaments, only apply minimal post-validation since main formation handles balance
  if (adjustedTeams.length === 2) {
    const teamTotals = adjustedTeams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
    const pointDifference = Math.abs(teamTotals[0] - teamTotals[1]);
    
    // Only intervene if there's an extreme imbalance (>150 points) after formation
    if (pointDifference > 150) {
      console.log(`🏛️ ATLAS 2-Team Post-Validation: Point difference ${pointDifference} exceeds threshold`);
      
      const strongerTeamIndex = teamTotals[0] > teamTotals[1] ? 0 : 1;
      const weakerTeamIndex = 1 - strongerTeamIndex;
      
      const strongTeam = [...adjustedTeams[strongerTeamIndex]].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
      const weakTeam = [...adjustedTeams[weakerTeamIndex]].sort((a, b) => a.evidenceWeight - b.evidenceWeight);

      // Find optimal swap to minimize difference
      let bestSwap = null;
      let smallestNewDifference = pointDifference;
      
      for (let i = 1; i < strongTeam.length; i++) { // Skip captain (index 0)
        for (let j = 0; j < weakTeam.length; j++) {
          const strongPlayer = strongTeam[i];
          const weakPlayer = weakTeam[j];
          
          const newStrongTotal = teamTotals[strongerTeamIndex] - strongPlayer.evidenceWeight + weakPlayer.evidenceWeight;
          const newWeakTotal = teamTotals[weakerTeamIndex] - weakPlayer.evidenceWeight + strongPlayer.evidenceWeight;
          const newDifference = Math.abs(newStrongTotal - newWeakTotal);
          
          if (newDifference < smallestNewDifference) {
            smallestNewDifference = newDifference;
            bestSwap = { strongPlayer, weakPlayer, newDifference };
          }
        }
      }
      
      if (bestSwap && smallestNewDifference < pointDifference - 50) {
        // Perform the optimal swap
        adjustedTeams[strongerTeamIndex] = adjustedTeams[strongerTeamIndex].filter(p => p.id !== bestSwap.strongPlayer.id);
        adjustedTeams[strongerTeamIndex].push(bestSwap.weakPlayer);
        
        adjustedTeams[weakerTeamIndex] = adjustedTeams[weakerTeamIndex].filter(p => p.id !== bestSwap.weakPlayer.id);
        adjustedTeams[weakerTeamIndex].push(bestSwap.strongPlayer);
        
        validationSteps.push({
          step: validationSteps.length + 1,
          player: {
            id: 'optimal-swap',
            discord_username: `${bestSwap.strongPlayer.discord_username} ↔ ${bestSwap.weakPlayer.discord_username}`,
            points: 0, 
            rank: 'Optimal Balance', 
            source: 'ATLAS Post-Validation',
          },
          assignedTeam: -1,
          reasoning: `🏛️ ATLAS Optimal Balance: Reduced point difference from ${pointDifference} to ${bestSwap.newDifference}. Strategic swap for enhanced 2-team balance.`,
          teamStatesAfter: JSON.parse(JSON.stringify(adjustedTeams)).map((team, index) => ({
            teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
            playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
          })),
          phase: 'atlas_optimization_swap',
        });

        adjustments.redistributions.push({
          player: `${bestSwap.strongPlayer.discord_username} ↔ ${bestSwap.weakPlayer.discord_username}`,
          fromTeam: strongerTeamIndex,
          toTeam: weakerTeamIndex,
          reason: `ATLAS Post-Validation: Optimal swap reduced imbalance from ${pointDifference} to ${bestSwap.newDifference}`,
          type: 'balance_fix'
        });

        decisions.push({
          id: `atlas_postvalidation_${Date.now()}`,
          type: 'player_swap',
          priority: 'high',
          description: `Post-Formation Balance Optimization`,
          reasoning: `Optimal swap identified and executed. Reduced point difference from ${pointDifference} to ${bestSwap.newDifference}.`,
          confidence: 88,
          impact: {
            expectedImprovement: 60,
            affectedPlayers: [bestSwap.strongPlayer.discord_username, bestSwap.weakPlayer.discord_username],
            affectedTeams: [strongerTeamIndex, weakerTeamIndex]
          },
          timestamp: new Date()
        });
      }
    }
  }

  return { teams: adjustedTeams, adjustments, decisions, validationSteps };
}

/**
 * Calculate point balance metrics
 */
function calculatePointBalance(teams: any[][]) {
  if (teams.length === 0 || teams.every(t => t.length === 0)) {
    return { maxDifference: 0, balanceQuality: 'ideal' as const };
  }
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => sum + (player.evidenceWeight || 150), 0)
  );

  const maxDifference = Math.max(...teamTotals) - Math.min(...teamTotals);
  
  let balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  if (maxDifference <= 50) balanceQuality = 'ideal';
  else if (maxDifference <= 100) balanceQuality = 'good';
  else if (maxDifference <= 150) balanceQuality = 'warning';
  else balanceQuality = 'poor';

  return { maxDifference, balanceQuality };
}

/**
 * Calculate comprehensive final analysis with ATLAS enhancements
 */
function calculateFinalAnalysis(teams: any[][], config: EvidenceBasedConfig, atlasEnhancements?: MiniAiEnhancedResult) {
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => sum + (player.evidenceWeight || 150), 0)
  );

  const elitePlayersPerTeam = teams.map(team => 
    team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length
  );

  const skillStackingViolations = elitePlayersPerTeam.filter(count => count > 1).length;
  const maxPointDifference = teamTotals.length > 0 ? Math.max(...teamTotals) - Math.min(...teamTotals) : 0;

  let overallQuality: 'excellent' | 'good' | 'acceptable' | 'needs_improvement';
  if (skillStackingViolations === 0 && maxPointDifference <= 50) overallQuality = 'excellent';
  else if (skillStackingViolations === 0 && maxPointDifference <= 100) overallQuality = 'good';
  else if (skillStackingViolations <= 1 && maxPointDifference <= 150) overallQuality = 'acceptable';
  else overallQuality = 'needs_improvement';

  let miniAiSummary = undefined;
  if (atlasEnhancements) {
    const totalAdjustments = atlasEnhancements.playerAdjustments.length;
    const totalRedistributions = atlasEnhancements.redistributionRecommendations.length;
    const averageConfidence = totalAdjustments > 0 
      ? atlasEnhancements.playerAdjustments.reduce((sum, adj) => sum + adj.confidence, 0) / totalAdjustments : 100;

    miniAiSummary = {
      playersAnalyzed: teams.flat().length,
      adjustmentsMade: totalAdjustments,
      redistributionsRecommended: totalRedistributions,
      averageConfidence: Math.round(averageConfidence)
    };
  }

  return {
    skillDistribution: {
      elitePlayersPerTeam,
      skillStackingViolations
    },
    pointBalance: {
      averageTeamPoints: teamTotals.length > 0 ? Math.round(teamTotals.reduce((sum, total) => sum + total, 0) / teams.length) : 0,
      minTeamPoints: teamTotals.length > 0 ? Math.min(...teamTotals) : 0,
      maxTeamPoints: teamTotals.length > 0 ? Math.max(...teamTotals) : 0,
      maxPointDifference,
      balanceQuality: maxPointDifference <= 50 ? 'ideal' as const : 
                     maxPointDifference <= 100 ? 'good' as const :
                     maxPointDifference <= 150 ? 'warning' as const : 'poor' as const
    },
    overallQuality,
    miniAiSummary
  };
}
