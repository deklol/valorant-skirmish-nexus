
import { UnifiedBracketService } from "@/services/unifiedBracketService";

export interface BracketProgressionDiagnostic {
  tournamentId: string;
  issues: string[];
  suggestions: string[];
  nextActions: string[];
}

/**
 * Diagnose bracket progression using unified service
 */
export async function diagnoseBracketProgression(tournamentId: string): Promise<BracketProgressionDiagnostic> {
  console.log('🔍 Legacy diagnoseBracketProgression called - routing to unified service');
  
  try {
    const validation = await UnifiedBracketService.diagnoseBracket(tournamentId);
    
    return {
      tournamentId,
      issues: validation.issues,
      suggestions: validation.issues.map(issue => `Fix: ${issue}`),
      nextActions: validation.issues.map(issue => `AUTO_FIX: ${issue}`)
    };
  } catch (error: any) {
    return {
      tournamentId,
      issues: [`Diagnostic error: ${error.message}`],
      suggestions: [],
      nextActions: []
    };
  }
}

/**
 * Auto-fix bracket progression using unified service
 */
export async function autoFixBracketProgression(tournamentId: string): Promise<{
  success: boolean;
  fixesApplied: string[];
  errors: string[];
}> {
  console.log('🔧 Legacy autoFixBracketProgression called - routing to unified service');
  
  try {
    const result = await UnifiedBracketService.fixAllBracketProgression(tournamentId);
    
    return {
      success: result.success,
      fixesApplied: [`Applied ${result.fixesApplied} bracket progression fixes`],
      errors: result.errors
    };
  } catch (error: any) {
    return {
      success: false,
      fixesApplied: [],
      errors: [`Auto-fix error: ${error.message}`]
    };
  }
}
