import { supabase } from "@/integrations/supabase/client";
import { getOriginalTeamCount } from "@/utils/bracketCalculations";

// Data types for bracket progression
interface BracketProgressionResult {
  success: boolean;
  fixesApplied: number;
  issues: string[];
  errors: string[];
  tournamentCompleted?: boolean;
  winner?: string | null;
}

interface MatchAdvancementResult {
  success: boolean;
  tournamentCompleted: boolean;
  winner: string | null;
  nextMatchReady: boolean;
  nextMatchId: string | null;
  error: string | null;
}

/**
 * UNIFIED bracket progression service - CONSOLIDATED TO DATABASE-LEVEL OPERATIONS
 * 
 * This service has been refactored to route all operations to secure database-level RPC functions.
 * The conflicting JavaScript client-side logic has been removed in favor of the database system.
 */
export class UnifiedBracketService {
  
  /**
   * DEPRECATED: Use database-level `advance_match_winner_secure` RPC instead
   * 
   * The original client-side match advancement logic has been replaced with a secure
   * database-level RPC function that handles all progression automatically.
   * 
   * @deprecated Use `supabase.rpc('advance_match_winner_secure', ...)` for reliable match progression
   */
  static async advanceMatchWinner(
    matchId: string,
    winnerId: string,
    loserId: string,
    tournamentId: string,
    scoreTeam1?: number,
    scoreTeam2?: number
  ): Promise<MatchAdvancementResult> {
    console.warn('⚠️ DEPRECATED: UnifiedBracketService.advanceMatchWinner is deprecated');
    console.warn('🔧 Use supabase.rpc("advance_match_winner_secure", ...) for reliable match progression');
    
    return {
      success: false,
      tournamentCompleted: false,
      winner: null,
      nextMatchReady: false,
      nextMatchId: null,
      error: 'DEPRECATED: Use database-level advance_match_winner_secure RPC instead'
    };
  }

  /**
   * DEPRECATED: Use database-level `fix_all_bracket_progression` RPC instead
   * 
   * The original client-side bracket fixing logic has been replaced with a secure
   * database-level RPC function that uses the existing secure advancement function.
   * 
   * @deprecated Use `supabase.rpc('fix_all_bracket_progression', ...)` for reliable bracket fixing
   */
  static async fixAllBracketProgression(tournamentId: string): Promise<BracketProgressionResult> {
    console.warn('⚠️ DEPRECATED: UnifiedBracketService.fixAllBracketProgression is deprecated');
    console.warn('🔧 Use supabase.rpc("fix_all_bracket_progression", ...) for database-level fixing');
    
    return {
      success: false,
      fixesApplied: 0,
      issues: ['DEPRECATED: Use database-level fix_all_bracket_progression RPC instead'],
      errors: ['This method has been deprecated in favor of database-level operations'],
      tournamentCompleted: false,
      winner: null
    };
  }

  /**
   * DEPRECATED: Use database-level `diagnose_bracket_progression` RPC instead
   * 
   * The original client-side diagnostic logic has been replaced with a secure
   * database-level RPC function that provides comprehensive bracket analysis.
   * 
   * @deprecated Use `supabase.rpc('diagnose_bracket_progression', ...)` for database-level diagnosis
   */
  static async diagnoseBracket(tournamentId: string) {
    console.warn('⚠️ DEPRECATED: UnifiedBracketService.diagnoseBracket is deprecated');
    console.warn('🔧 Use supabase.rpc("diagnose_bracket_progression", ...) for database-level diagnosis');
    
    return {
      tournamentId,
      originalTeamCount: 0,
      totalMatches: 0,
      issues: ['DEPRECATED: Use database-level diagnose_bracket_progression RPC instead'],
      isHealthy: false
    };
  }

  /**
   * UTILITY: Create a missing match in the database
   * This utility function is still needed for bracket reconstruction operations.
   */
  static async createMissingMatch(
    tournamentId: string, 
    round: number, 
    matchNumber: number
  ) {
    try {
      const { data: newMatch, error } = await supabase
        .from('matches')
        .insert({
          tournament_id: tournamentId,
          round_number: round,
          match_number: matchNumber,
          status: 'pending',
          score_team1: 0,
          score_team2: 0
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to create missing match R${round}M${matchNumber}:`, error);
        return null;
      }

      console.log(`✅ Created missing match R${round}M${matchNumber}`);
      return newMatch;
    } catch (error) {
      console.error(`Error creating missing match R${round}M${matchNumber}:`, error);
      return null;
    }
  }

  /**
   * UTILITY: Generate expected bracket structure based on team count
   * This utility function is still useful for bracket validation and reconstruction.
   */
  static generateExpectedBracketStructure(teamCount: number) {
    const rounds = Math.ceil(Math.log2(teamCount));
    const structure: { round: number; matches: number }[] = [];
    
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.ceil(teamCount / Math.pow(2, round));
      structure.push({ round, matches: matchesInRound });
    }
    
    return structure;
  }

  /**
   * UTILITY: Validate bracket structure matches expected format
   * This utility function helps ensure bracket integrity during operations.
   */
  static async validateBracketStructure(
    matches: any[], 
    expectedStructure: any, 
    tournamentId: string
  ) {
    console.log(`🔍 Validating bracket structure for tournament ${tournamentId}`);
    
    for (const expected of expectedStructure) {
      const roundMatches = matches.filter(m => m.round_number === expected.round);
      
      if (roundMatches.length !== expected.matches) {
        console.warn(
          `⚠️ Round ${expected.round}: expected ${expected.matches} matches, found ${roundMatches.length}`
        );
      }
    }
    
    console.log(`✅ Bracket structure validation completed`);
  }
}

// Export the types for use by other components
export type { BracketProgressionResult, MatchAdvancementResult };