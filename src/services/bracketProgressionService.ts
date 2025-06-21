
import { supabase } from "@/integrations/supabase/client";
import { calculateBracketStructure, findNextMatchPosition, getWinnerSlot, validateBracketProgression } from "@/utils/bracketCalculations";

export interface ProgressionResult {
  success: boolean;
  fixesApplied: number;
  issues: string[];
  errors: string[];
}

/**
 * Comprehensive bracket progression fixer for any tournament size
 */
export async function fixBracketProgression(tournamentId: string): Promise<ProgressionResult> {
  const result: ProgressionResult = {
    success: false,
    fixesApplied: 0,
    issues: [],
    errors: []
  };

  try {
    console.log('🔧 Starting dynamic bracket progression fix...');
    
    // Get all matches and teams for this tournament
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

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .neq('status', 'eliminated');

    if (teamsError || !teams) {
      result.errors.push('Failed to fetch tournament teams');
      return result;
    }

    // Calculate proper bracket structure
    const bracketStructure = calculateBracketStructure(teams.length);
    console.log('📊 Bracket structure:', bracketStructure);
    
    // Validate current bracket state
    const validation = validateBracketProgression(allMatches, bracketStructure);
    result.issues = validation.issues;
    
    if (validation.isValid) {
      console.log('✅ Bracket progression is already correct');
      result.success = true;
      return result;
    }

    // Fix progression issues
    const completedMatches = allMatches.filter(m => m.status === 'completed' && m.winner_id);
    console.log(`🏆 Found ${completedMatches.length} completed matches to process`);

    for (const match of completedMatches) {
      // Skip final round
      if (match.round_number >= bracketStructure.totalRounds) {
        console.log(`⏭️ Skipping final round match R${match.round_number}M${match.match_number}`);
        continue;
      }

      const nextPos = findNextMatchPosition(match.round_number, match.match_number, bracketStructure);
      if (!nextPos) {
        console.log(`⏭️ No next position for R${match.round_number}M${match.match_number}`);
        continue;
      }

      // Find the target match
      const targetMatch = allMatches.find(m => 
        m.round_number === nextPos.round && m.match_number === nextPos.matchNumber
      );

      if (!targetMatch) {
        result.errors.push(`Target match R${nextPos.round}M${nextPos.matchNumber} not found`);
        continue;
      }

      // Determine correct slot and check if update needed
      const targetSlot = getWinnerSlot(match.match_number);
      const currentOccupant = targetMatch[targetSlot];

      if (currentOccupant !== match.winner_id) {
        console.log(`🔄 Advancing winner from R${match.round_number}M${match.match_number} to R${nextPos.round}M${nextPos.matchNumber} (${targetSlot})`);
        
        // Update the target match
        const { error: updateError } = await supabase
          .from('matches')
          .update({ [targetSlot]: match.winner_id })
          .eq('id', targetMatch.id);

        if (updateError) {
          result.errors.push(`Failed to advance winner: ${updateError.message}`);
          continue;
        }

        result.fixesApplied++;

        // Check if target match now has both teams and should go live
        const otherSlot = targetSlot === 'team1_id' ? 'team2_id' : 'team1_id';
        const otherTeam = targetMatch[otherSlot];
        
        if (otherTeam && targetMatch.status === 'pending') {
          const { error: statusError } = await supabase
            .from('matches')
            .update({ status: 'live' })
            .eq('id', targetMatch.id);

          if (!statusError) {
            console.log(`🔥 Set R${nextPos.round}M${nextPos.matchNumber} to live (both teams assigned)`);
          }
        }
      }
    }

    result.success = result.errors.length === 0;
    console.log(`🎉 Bracket progression fix complete: ${result.fixesApplied} fixes applied`);
    
    return result;
  } catch (error: any) {
    result.errors.push(`Progression fix error: ${error.message}`);
    return result;
  }
}
