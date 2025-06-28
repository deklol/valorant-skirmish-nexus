
import { supabase } from "@/integrations/supabase/client";

/**
 * Tournament Deletion Utility
 * 
 * Provides comprehensive tournament deletion with:
 * - Statistics reversal (wins/losses/tournament stats)
 * - Complete cleanup of all related data
 * - Safety checks and validation
 * - Detailed audit logging
 */

export interface TournamentDeletionResult {
  success: boolean;
  tournament_name?: string;
  deleted_counts?: Record<string, number>;
  statistics_reversed?: {
    participants_tournaments_played_decremented: number;
    winners_tournament_wins_decremented: number;
  };
  error?: string;
  error_code?: string;
}

export interface TournamentDeletionPreview {
  tournament_name: string;
  tournament_status: string;
  total_participants: number;
  total_teams: number;
  total_matches: number;
  veto_sessions: number;
  can_delete: boolean;
  deletion_restrictions?: string[];
}

/**
 * Get a preview of what would be deleted for a tournament
 */
export async function previewTournamentDeletion(tournamentId: string): Promise<TournamentDeletionPreview | null> {
  console.log(`🔍 TournamentDeletion: Previewing deletion for tournament ${tournamentId.slice(0, 8)}`);
  
  try {
    // Get tournament details
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('name, status')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      console.error('❌ TournamentDeletion: Tournament not found:', tournamentError);
      return null;
    }

    // Count participants
    const { count: participantCount } = await supabase
      .from('tournament_signups')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    // Count teams
    const { count: teamCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    // Count matches
    const { count: matchCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    // Count veto sessions
    const { data: vetoSessionsData } = await supabase
      .from('map_veto_sessions')
      .select('id')
      .in('match_id', 
        supabase
          .from('matches')
          .select('id')
          .eq('tournament_id', tournamentId)
      );

    // Check deletion restrictions
    const restrictions: string[] = [];
    const canDelete = tournament.status in ['completed', 'archived', 'draft'];
    
    if (!canDelete) {
      restrictions.push(`Tournament status '${tournament.status}' is not eligible for deletion`);
      restrictions.push("Only 'completed', 'archived', or 'draft' tournaments can be deleted");
    }

    const preview: TournamentDeletionPreview = {
      tournament_name: tournament.name,
      tournament_status: tournament.status,
      total_participants: participantCount || 0,
      total_teams: teamCount || 0,
      total_matches: matchCount || 0,
      veto_sessions: vetoSessionsData?.length || 0,
      can_delete: canDelete,
      deletion_restrictions: restrictions.length > 0 ? restrictions : undefined
    };

    console.log(`📊 TournamentDeletion: Preview for ${tournament.name}:`, preview);
    return preview;

  } catch (error: any) {
    console.error('❌ TournamentDeletion: Preview failed:', error);
    return null;
  }
}

/**
 * Safely delete a tournament with comprehensive cleanup and statistics reversal
 */
export async function safeDeleteTournament(tournamentId: string): Promise<TournamentDeletionResult> {
  const shortId = tournamentId.slice(0, 8);
  console.log(`🗑️ TournamentDeletion: Starting safe deletion for tournament ${shortId}`);

  try {
    // Call the database function that handles everything safely
    const { data, error } = await supabase.rpc('safe_delete_tournament', {
      p_tournament_id: tournamentId
    });

    if (error) {
      console.error(`❌ TournamentDeletion: Database function failed for ${shortId}:`, error);
      return {
        success: false,
        error: error.message || 'Database function failed',
        error_code: error.code
      };
    }

    const result = data as TournamentDeletionResult;
    
    if (result.success) {
      console.log(`✅ TournamentDeletion: Successfully deleted tournament ${shortId}`);
      console.log(`📊 TournamentDeletion: Deletion summary:`, {
        tournament_name: result.tournament_name,
        deleted_counts: result.deleted_counts,
        statistics_reversed: result.statistics_reversed
      });
    } else {
      console.error(`❌ TournamentDeletion: Deletion failed for ${shortId}:`, result.error);
    }

    return result;

  } catch (error: any) {
    console.error(`❌ TournamentDeletion: Unexpected error for ${shortId}:`, error);
    return {
      success: false,
      error: error.message || 'Unexpected error occurred',
      error_code: 'UNEXPECTED_ERROR'
    };
  }
}

/**
 * Validate if a tournament can be safely deleted
 */
export async function validateTournamentDeletion(tournamentId: string): Promise<{
  canDelete: boolean;
  reasons: string[];
}> {
  console.log(`🔍 TournamentDeletion: Validating deletion eligibility for ${tournamentId.slice(0, 8)}`);
  
  const preview = await previewTournamentDeletion(tournamentId);
  
  if (!preview) {
    return {
      canDelete: false,
      reasons: ['Tournament not found or inaccessible']
    };
  }

  return {
    canDelete: preview.can_delete,
    reasons: preview.deletion_restrictions || []
  };
}
