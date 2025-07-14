
import { supabase } from "@/integrations/supabase/client";

export interface ProgressionResult {
  success: boolean;
  fixesApplied: number;
  issues: string[];
  errors: string[];
}

/**
 * Database-level bracket progression fix - uses secure database RPC
 */
export async function fixBracketProgression(tournamentId: string): Promise<ProgressionResult> {
  console.log('🔧 fixBracketProgression routing to database-level fix_all_bracket_progression');
  
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
      fixesApplied: parsedResult.fixes_applied || 0,
      issues: [],
      errors: parsedResult.errors || []
    };
  } catch (error: any) {
    return {
      success: false,
      fixesApplied: 0,
      issues: [],
      errors: [error.message]
    };
  }
}
