
import { supabase } from "@/integrations/supabase/client";
import { 
  calculateBracketStructure, 
  validateBracketProgression, 
  findNextMatchPosition, 
  getWinnerSlot,
  getMatchesNeedingProgression,
  getReadyMatches,
  isTournamentFinal,
  getOriginalTeamCount
} from "@/utils/bracketCalculations";
import { completeTournament } from "@/utils/completeTournament";

export interface BracketProgressionResult {
  success: boolean;
  fixesApplied: number;
  issues: string[];
  errors: string[];
  tournamentComplete?: boolean;
  winner?: string;
}

export interface MatchAdvancementResult {
  success: boolean;
  tournamentComplete: boolean;
  winner?: string;
  nextMatchReady?: boolean;
  nextMatchId?: string;
  error?: string;
}

/**
 * UNIFIED bracket progression service - used by ALL tournament flows
 * CRITICAL FIX: Always uses original team count for bracket structure calculations
 */
export class UnifiedBracketService {
  
  /**
   * Advance a single match winner and handle all progression logic
   * FIXED: Uses original team count for proper bracket structure
   */
  static async advanceMatchWinner(
    matchId: string,
    winnerId: string,
    loserId: string,
    tournamentId: string,
    scoreTeam1?: number,
    scoreTeam2?: number
  ): Promise<MatchAdvancementResult> {
    console.log('🏆 UnifiedBracketService: Advancing match winner', { matchId, winnerId, tournamentId });
    
    try {
      // Step 1: Update the match as completed
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          winner_id: winnerId,
          status: 'completed',
          completed_at: new Date().toISOString(),
          ...(scoreTeam1 !== undefined && scoreTeam2 !== undefined && {
            score_team1: scoreTeam1,
            score_team2: scoreTeam2
          })
        })
        .eq('id', matchId);

      if (updateError) throw updateError;

      // Step 2: Get tournament context using ORIGINAL team count
      const { data: allMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (matchesError || !allMatches) {
        throw new Error('Failed to load tournament matches');
      }

      // CRITICAL FIX: Get original team count, not current active teams
      const originalTeamCount = await getOriginalTeamCount(tournamentId);
      if (originalTeamCount === 0) {
        throw new Error('Failed to determine original team count');
      }

      console.log(`🎯 Processing advancement with ${originalTeamCount} original teams`);

      // Step 3: Calculate bracket structure using ORIGINAL team count
      const bracketStructure = calculateBracketStructure(originalTeamCount);
      const currentMatch = allMatches.find(m => m.id === matchId);
      
      if (!currentMatch) {
        throw new Error('Match not found after update');
      }

      // Step 4: Check if this is the tournament final
      if (isTournamentFinal(currentMatch, bracketStructure)) {
        console.log('🎉 Tournament final completed! Winner:', winnerId);
        
        // Mark winner and loser
        await supabase.from('teams').update({ status: 'winner' }).eq('id', winnerId);
        await supabase.from('teams').update({ status: 'eliminated' }).eq('id', loserId);
        
        // Complete tournament
        await completeTournament(tournamentId, winnerId);
        
        return {
          success: true,
          tournamentComplete: true,
          winner: winnerId
        };
      }

      // Step 5: Advance winner to next round
      const nextPos = findNextMatchPosition(
        currentMatch.round_number, 
        currentMatch.match_number, 
        bracketStructure
      );

      if (!nextPos) {
        console.log('ℹ️ No next position found (likely tournament end)');
        return { success: true, tournamentComplete: false };
      }

      console.log(`🎯 Advancing winner to R${nextPos.round}M${nextPos.matchNumber}`);

      const nextMatch = allMatches.find(m => 
        m.round_number === nextPos.round && m.match_number === nextPos.matchNumber
      );

      if (!nextMatch) {
        throw new Error(`Next match not found: Round ${nextPos.round}, Match ${nextPos.matchNumber}`);
      }

      // Step 6: Update next match with winner
      const targetSlot = getWinnerSlot(currentMatch.match_number);
      
      console.log(`🎯 Placing winner ${winnerId.slice(0,8)} in ${targetSlot} of R${nextPos.round}M${nextPos.matchNumber}`);
      
      const { error: advanceError } = await supabase
        .from('matches')
        .update({ [targetSlot]: winnerId })
        .eq('id', nextMatch.id);

      if (advanceError) throw advanceError;

      // Step 7: Check if next match is ready (both teams assigned)
      const otherSlot = targetSlot === 'team1_id' ? 'team2_id' : 'team1_id';
      const otherTeam = nextMatch[otherSlot];
      let nextMatchReady = false;

      if (otherTeam && nextMatch.status === 'pending') {
        const { error: statusError } = await supabase
          .from('matches')
          .update({ status: 'live' })
          .eq('id', nextMatch.id);

        if (!statusError) {
          nextMatchReady = true;
          console.log('🔥 Next match is now live with both teams');
        }
      }

      // Step 8: Eliminate loser
      await supabase.from('teams').update({ status: 'eliminated' }).eq('id', loserId);

      console.log('✅ Match winner advanced successfully');
      
      return {
        success: true,
        tournamentComplete: false,
        nextMatchReady,
        nextMatchId: nextMatch.id
      };

    } catch (error: any) {
      console.error('❌ Match advancement error:', error);
      return {
        success: false,
        tournamentComplete: false,
        error: error.message
      };
    }
  }

  /**
   * Fix all bracket progression issues for a tournament
   * CRITICAL FIX: Uses original team count for proper validation and includes detailed logging
   */
  static async fixAllBracketProgression(tournamentId: string): Promise<BracketProgressionResult> {
    console.log('🔧 UnifiedBracketService: Fixing all bracket progression issues for tournament:', tournamentId);
    
    const result: BracketProgressionResult = {
      success: false,
      fixesApplied: 0,
      issues: [],
      errors: []
    };

    try {
      // Get all matches
      const { data: allMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (matchesError || !allMatches) {
        result.errors.push('Failed to fetch tournament matches');
        return result;
      }

      console.log(`🔍 Loaded ${allMatches.length} matches for tournament`);

      // CRITICAL FIX: Get original team count for proper bracket structure
      const originalTeamCount = await getOriginalTeamCount(tournamentId);
      if (originalTeamCount === 0) {
        result.errors.push('Failed to determine original team count');
        return result;
      }

      console.log(`🏗️ Using original team count: ${originalTeamCount} for bracket validation`);

      // Validate current state using original team count
      const validation = validateBracketProgression(allMatches, originalTeamCount);
      result.issues = validation.issues;

      if (validation.isValid) {
        console.log('✅ Bracket is already valid');
        result.success = true;
        return result;
      }

      console.log(`🔍 Bracket issues found (${validation.issues.length}):`, validation.issues);

      // Fix progression issues using original team count
      const matchesNeedingProgression = getMatchesNeedingProgression(allMatches, originalTeamCount);
      const bracketStructure = calculateBracketStructure(originalTeamCount);
      
      console.log(`🔄 Found ${matchesNeedingProgression.length} matches needing progression`);

      for (const match of matchesNeedingProgression) {
        console.log(`🔄 Fixing progression for R${match.round_number}M${match.match_number} winner: ${match.winner_id?.slice(0,8)}`);
        
        const nextPos = findNextMatchPosition(match.round_number, match.match_number, bracketStructure);
        if (!nextPos) continue;

        const nextMatch = allMatches.find(m => 
          m.round_number === nextPos.round && m.match_number === nextPos.matchNumber
        );
        if (!nextMatch) continue;

        const targetSlot = getWinnerSlot(match.match_number);
        
        console.log(`🎯 Advancing winner ${match.winner_id?.slice(0,8)} to R${nextPos.round}M${nextPos.matchNumber} slot ${targetSlot}`);
        
        const { error: updateError } = await supabase
          .from('matches')
          .update({ [targetSlot]: match.winner_id })
          .eq('id', nextMatch.id);

        if (updateError) {
          result.errors.push(`Failed to advance R${match.round_number}M${match.match_number}: ${updateError.message}`);
          continue;
        }

        result.fixesApplied++;
        console.log(`✅ Fixed progression for R${match.round_number}M${match.match_number}`);
      }

      // Set ready matches to live
      const readyMatches = getReadyMatches(allMatches);
      console.log(`🔥 Setting ${readyMatches.length} ready matches to live`);
      
      for (const match of readyMatches) {
        const { error: statusError } = await supabase
          .from('matches')
          .update({ status: 'live' })
          .eq('id', match.id);

        if (!statusError) {
          result.fixesApplied++;
          console.log(`🔥 Set R${match.round_number}M${match.match_number} to live`);
        }
      }

      result.success = result.errors.length === 0;
      console.log(`🎉 Fixed ${result.fixesApplied} bracket progression issues`);
      
      return result;

    } catch (error: any) {
      console.error('❌ Bracket fix error:', error);
      result.errors.push(`Bracket fix error: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate and diagnose bracket health
   * CRITICAL FIX: Uses original team count for proper validation
   */
  static async diagnoseBracket(tournamentId: string) {
    try {
      const { data: allMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (matchesError || !allMatches) {
        throw new Error('Failed to fetch matches');
      }

      // CRITICAL FIX: Use original team count for validation
      const originalTeamCount = await getOriginalTeamCount(tournamentId);
      if (originalTeamCount === 0) {
        throw new Error('Failed to determine original team count');
      }

      console.log(`🔍 Diagnosing bracket with original team count: ${originalTeamCount}`);
      
      return validateBracketProgression(allMatches, originalTeamCount);
    } catch (error: any) {
      return {
        isValid: false,
        issues: [`Diagnosis error: ${error.message}`],
        tournamentComplete: false
      };
    }
  }
}
