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
 * EXACT SAME LOGIC as TournamentBalanceTransparency.tsx getUnifiedATLASCalculations()
 */
export function extractATLASWeightsFromBalanceAnalysis(balanceAnalysis: BalanceAnalysis | null): StoredATLASWeight[] {
  if (!balanceAnalysis) return [];

  console.log('🔍 BROADCAST ATLAS EXTRACTION:', {
    hasBalanceAnalysis: !!balanceAnalysis,
    keys: Object.keys(balanceAnalysis || {}),
    hasEvidenceCalculations: !!(balanceAnalysis.evidenceCalculations),
    hasAtlasCalculations: !!(balanceAnalysis.atlasCalculations),
    hasAdaptiveCalculations: !!(balanceAnalysis.adaptiveWeightCalculations || balanceAnalysis.adaptive_weight_calculations),
    hasBalanceSteps: !!(balanceAnalysis.balanceSteps || balanceAnalysis.balance_steps)
  });

  // First try to get actual calculation data (EXACT same order as transparency component)
  const calculations = balanceAnalysis.atlasCalculations || 
                      balanceAnalysis.adaptiveWeightCalculations || 
                      balanceAnalysis.adaptive_weight_calculations || 
                      balanceAnalysis.evidenceCalculations || 
                      [];

  if (calculations.length > 0) {
    console.log('🏛️ BROADCAST: Found stored calculations:', {
      total: calculations.length,
      firstCalc: calculations[0],
      calculationKeys: calculations[0]?.calculation ? Object.keys(calculations[0].calculation) : []
    });

    // Use EXACT same logic as transparency component
    const uniqueCalculations = calculations.filter((calc: any, index: number, self: any[]) => 
      index === self.findIndex((c: any) => c.userId === calc.userId)
    );

    return uniqueCalculations.map((calc: any) => {
      const storedCalc = calc.calculation as any;
      
      // Try multiple weight field names (same as transparency)
      const points = storedCalc?.finalPoints || 
                    storedCalc?.calculatedAdaptiveWeight || 
                    storedCalc?.points ||
                    storedCalc?.evidenceWeight ||
                    storedCalc?.weightRating ||
                    calc.points ||
                    150;

      console.log(`📊 BROADCAST USER ${calc.userId}:`, {
        finalPoints: storedCalc?.finalPoints,
        calculatedAdaptiveWeight: storedCalc?.calculatedAdaptiveWeight,
        points: storedCalc?.points,
        evidenceWeight: storedCalc?.evidenceWeight,
        selectedWeight: points
      });

      return {
        userId: calc.userId,
        points: points,
        rank: storedCalc?.currentRank || storedCalc?.rank || calc.rank || 'Unranked',
        source: 'atlas_stored_calculation',
        evidenceReasoning: storedCalc?.calculationReasoning || storedCalc?.evidenceReasoning
      };
    });
  }

  // Fall back to balance steps (same as transparency component)
  const balanceSteps = balanceAnalysis.balanceSteps || balanceAnalysis.balance_steps || [];
  
  if (balanceSteps.length > 0) {
    console.log('🏛️ BROADCAST: Using balance steps as fallback:', balanceSteps.length);
    return balanceSteps.map((step: BalanceStep) => ({
      userId: step.player.id || 'unknown',
      points: step.player.evidenceWeight || step.player.points || 150,
      rank: step.player.rank || 'Unranked',
      source: 'balance_steps_fallback',
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