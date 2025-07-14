
import { supabase } from "@/integrations/supabase/client";

export interface BracketProgressionDiagnostic {
  tournamentId: string;
  issues: string[];
  suggestions: string[];
  nextActions: string[];
}

/**
 * Database-level bracket progression diagnosis - uses secure database RPC
 */
export async function diagnoseBracketProgression(tournamentId: string): Promise<BracketProgressionDiagnostic> {
  console.log('🔍 diagnoseBracketProgression routing to database-level diagnose_bracket_progression');
  
  try {
    const { data: result, error } = await supabase.rpc('diagnose_bracket_progression', {
      p_tournament_id: tournamentId
    });

    if (error) {
      throw error;
    }

    const parsedResult = result as any;
    const issues = parsedResult.issues || [];
    
    return {
      tournamentId,
      issues: issues,
      suggestions: issues.map((issue: string) => `Fix: ${issue}`),
      nextActions: issues.map((issue: string) => `AUTO_FIX: ${issue}`)
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
 * Database-level auto-fix bracket progression - uses secure database RPC
 */
export async function autoFixBracketProgression(tournamentId: string): Promise<{
  success: boolean;
  fixesApplied: string[];
  errors: string[];
}> {
  console.log('🔧 autoFixBracketProgression routing to database-level fix_all_bracket_progression');
  
  try {
    const { data: result, error } = await supabase.rpc('fix_all_bracket_progression', {
      p_tournament_id: tournamentId
    });

    if (error) {
      throw error;
    }

    const parsedResult = result as any;
    return {
      success: parsedResult.success,
      fixesApplied: [`Applied ${parsedResult.fixes_applied} bracket progression fixes using database-level logic`],
      errors: parsedResult.errors || []
    };
  } catch (error: any) {
    return {
      success: false,
      fixesApplied: [],
      errors: [`Auto-fix error: ${error.message}`]
    };
  }
}
