/**
 * Utility functions for extracting ATLAS weights from stored tournament balance analysis
 * Used by broadcast pages to get consistent weight calculations
 */

interface StoredATLASWeight {
  userId: string;
  points: number;
  rank: string;
  source: string;
  evidenceReasoning?: string;
}

interface BalanceStep {
  player: {
    id?: string;
    discord_username?: string;
    rank: string;
    points: number;
    evidenceWeight?: number;
    evidenceReasoning?: string;
  };
}

interface BalanceAnalysis {
  balanceSteps?: BalanceStep[];
  balance_steps?: BalanceStep[];
  evidenceCalculations?: any[];
  atlasCalculations?: any[];
  adaptiveWeightCalculations?: any[];
  adaptive_weight_calculations?: any[];
}

/**
 * Extract ATLAS weights from stored tournament balance analysis
 * This uses the same logic as the tournament transparency component
 */
export function extractATLASWeightsFromBalanceAnalysis(balanceAnalysis: BalanceAnalysis | null): StoredATLASWeight[] {
  if (!balanceAnalysis) return [];

  console.log('🔍 BROADCAST ATLAS EXTRACTION:', {
    hasBalanceAnalysis: !!balanceAnalysis,
    keys: Object.keys(balanceAnalysis || {}),
    hasEvidenceCalculations: !!(balanceAnalysis.evidenceCalculations),
    hasBalanceSteps: !!(balanceAnalysis.balanceSteps || balanceAnalysis.balance_steps)
  });

  // First try to get stored calculation data (like transparency component does)
  const calculations = balanceAnalysis.atlasCalculations || 
                      balanceAnalysis.adaptiveWeightCalculations || 
                      balanceAnalysis.adaptive_weight_calculations || 
                      balanceAnalysis.evidenceCalculations || 
                      [];

  if (calculations.length > 0) {
    console.log('🏛️ BROADCAST: Using stored ATLAS calculations:', calculations.length);
    return calculations.map((calc: any) => ({
      userId: calc.userId,
      points: calc.calculation?.points || calc.calculation?.finalPoints || calc.calculation?.calculatedAdaptiveWeight || 0,
      rank: calc.calculation?.rank || calc.calculation?.currentRank || 'Unranked',
      source: 'atlas_evidence',
      evidenceReasoning: calc.calculation?.calculationReasoning
    }));
  }

  // Fall back to balance steps with evidence weights (same as transparency component)
  const balanceSteps = balanceAnalysis.balanceSteps || balanceAnalysis.balance_steps || [];
  
  if (balanceSteps.length > 0) {
    console.log('🏛️ BROADCAST: Using balance steps evidence:', balanceSteps.length);
    return balanceSteps.map((step: BalanceStep) => ({
      userId: step.player.id || 'unknown',
      points: step.player.evidenceWeight || step.player.points || 0,
      rank: step.player.rank || 'Unranked',
      source: 'evidence_based',
      evidenceReasoning: step.player.evidenceReasoning
    }));
  }

  console.log('❌ BROADCAST: No ATLAS data found in balance analysis');
  return [];
}

/**
 * Get ATLAS weight for a specific user from balance analysis
 */
export function getATLASWeightForUser(balanceAnalysis: BalanceAnalysis | null, userId: string, fallbackWeight: number = 150): number {
  const atlasWeights = extractATLASWeightsFromBalanceAnalysis(balanceAnalysis);
  const userWeight = atlasWeights.find(w => w.userId === userId);
  
  const finalWeight = userWeight?.points || fallbackWeight;
  
  console.log(`🎯 ATLAS Weight for user ${userId}:`, {
    found: !!userWeight,
    weight: finalWeight,
    source: userWeight?.source || 'fallback'
  });
  
  return finalWeight;
}