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
   * FIXED: Enhanced error handling for missing matches with bracket structure validation
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

      // ENHANCED: Validate bracket structure before proceeding
      await this.validateBracketStructure(allMatches, bracketStructure, tournamentId);

      // Step 4: Check if this is the tournament final
      if (isTournamentFinal(currentMatch, bracketStructure)) {
        console.log('🎉 Tournament final completed! Winner:', winnerId);
        
        // Mark winner and loser teams with proper status
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
        console.error(`❌ CRITICAL: Next match not found: Round ${nextPos.round}, Match ${nextPos.matchNumber}`);
        console.log('📋 Available matches:', allMatches.map(m => `R${m.round_number}M${m.match_number}`));
        
        // ENHANCED: Auto-create missing match if possible
        const createdMatch = await this.createMissingMatch(tournamentId, nextPos.round, nextPos.matchNumber);
        if (!createdMatch) {
          throw new Error(`Next match not found: Round ${nextPos.round}, Match ${nextPos.matchNumber}. Available matches: ${allMatches.map(m => `R${m.round_number}M${m.match_number}`).join(', ')}. Auto-creation failed.`);
        }
        
        console.log(`✅ Auto-created missing match R${nextPos.round}M${nextPos.matchNumber}`);
        // Use the newly created match
        const targetSlot = getWinnerSlot(currentMatch.match_number);
        
        const { error: advanceError } = await supabase
          .from('matches')
          .update({ [targetSlot]: winnerId })
          .eq('id', createdMatch.id);

        if (advanceError) throw advanceError;

        // Eliminate loser team when auto-creating next match
        await supabase.from('teams').update({ status: 'eliminated' }).eq('id', loserId);

        return {
          success: true,
          tournamentComplete: false,
          nextMatchReady: false,
          nextMatchId: createdMatch.id
        };
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

      // Step 8: Eliminate loser team with proper status
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
   * NEW: Validate that bracket structure matches expectations
   */
  static async validateBracketStructure(matches: any[], expectedStructure: any, tournamentId: string) {
    const expectedMatches = [];
    for (let round = 1; round <= expectedStructure.totalRounds; round++) {
      const matchesInRound = expectedStructure.matchesPerRound[round - 1];
      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        expectedMatches.push(`R${round}M${matchNum}`);
      }
    }
    
    const actualMatches = matches.map(m => `R${m.round_number}M${m.match_number}`);
    const missingMatches = expectedMatches.filter(expected => !actualMatches.includes(expected));
    
    if (missingMatches.length > 0) {
      console.warn(`⚠️ Bracket structure validation failed for tournament ${tournamentId}:`);
      console.warn(`   Expected: ${expectedMatches.join(', ')}`);
      console.warn(`   Actual: ${actualMatches.join(', ')}`);
      console.warn(`   Missing: ${missingMatches.join(', ')}`);
    }
  }

  /**
   * NEW: Auto-create a missing match
   */
  static async createMissingMatch(tournamentId: string, round: number, matchNumber: number) {
    try {
      console.log(`🔧 Auto-creating missing match R${round}M${matchNumber}`);
      
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
        console.error(`❌ Failed to create missing match: ${error.message}`);
        return null;
      }

      return newMatch;
    } catch (error) {
      console.error(`❌ Error creating missing match:`, error);
      return null;
    }
  }

  /**
   * Fix all bracket progression issues for a tournament
   * CRITICAL FIX: Now handles missing matches and creates them if needed
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

      // CRITICAL FIX: Check for missing matches and create them
      const bracketStructure = calculateBracketStructure(originalTeamCount);
      await this.ensureAllMatchesExist(tournamentId, allMatches, bracketStructure, result);

      // Reload matches after potential creation
      const { data: updatedMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      const matchesToUse = updatedMatches || allMatches;

      // Fix progression issues using original team count
      const matchesNeedingProgression = getMatchesNeedingProgression(matchesToUse, originalTeamCount);
      
      console.log(`🔄 Found ${matchesNeedingProgression.length} matches needing progression`);

      for (const match of matchesNeedingProgression) {
        console.log(`🔄 Fixing progression for R${match.round_number}M${match.match_number} winner: ${match.winner_id?.slice(0,8)}`);
        
        const nextPos = findNextMatchPosition(match.round_number, match.match_number, bracketStructure);
        if (!nextPos) continue;

        const nextMatch = matchesToUse.find(m => 
          m.round_number === nextPos.round && m.match_number === nextPos.matchNumber
        );
        if (!nextMatch) {
          result.errors.push(`Next match R${nextPos.round}M${nextPos.matchNumber} not found for R${match.round_number}M${match.match_number}`);
          continue;
        }

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
      const readyMatches = getReadyMatches(matchesToUse);
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
   * Ensure all expected matches exist in the database
   */
  static async ensureAllMatchesExist(
    tournamentId: string, 
    existingMatches: any[], 
    bracketStructure: any,
    result: BracketProgressionResult
  ) {
    console.log('🔧 Checking for missing matches...');
    
    for (let round = 1; round <= bracketStructure.totalRounds; round++) {
      const expectedMatchesInRound = bracketStructure.matchesPerRound[round - 1];
      
      for (let matchNum = 1; matchNum <= expectedMatchesInRound; matchNum++) {
        const existingMatch = existingMatches.find(m => 
          m.round_number === round && m.match_number === matchNum
        );
        
        if (!existingMatch) {
          console.log(`🔧 Creating missing match: R${round}M${matchNum}`);
          
          const { error: createError } = await supabase
            .from('matches')
            .insert({
              tournament_id: tournamentId,
              round_number: round,
              match_number: matchNum,
              status: 'pending',
              score_team1: 0,
              score_team2: 0
            });
          
          if (createError) {
            result.errors.push(`Failed to create missing match R${round}M${matchNum}: ${createError.message}`);
          } else {
            result.fixesApplied++;
            console.log(`✅ Created missing match R${round}M${matchNum}`);
          }
        }
      }
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
