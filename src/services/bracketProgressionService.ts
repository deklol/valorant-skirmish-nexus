
import { UnifiedBracketService } from "@/services/unifiedBracketService";

export interface ProgressionResult {
  success: boolean;
  fixesApplied: number;
  issues: string[];
  errors: string[];
}

/**
 * Legacy wrapper for backward compatibility - now uses unified service
 */
export async function fixBracketProgression(tournamentId: string): Promise<ProgressionResult> {
  console.log('🔧 Legacy fixBracketProgression called - routing to unified service');
  
  const result = await UnifiedBracketService.fixAllBracketProgression(tournamentId);
  
  return {
    success: result.success,
    fixesApplied: result.fixesApplied,
    issues: result.issues,
    errors: result.errors
  };
}
