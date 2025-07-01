
import { supabase } from "@/integrations/supabase/client";

export interface EmergencyResetOptions {
  resetTeams?: boolean;
  resetMatches?: boolean;
  resetSignups?: boolean;
  resetStatus?: boolean;
  targetStatus?: 'draft' | 'open';
}

export interface EmergencyResetResult {
  success: boolean;
  message: string;
  itemsReset: {
    teams: number;
    matches: number;
    signups: number;
    statusChanged: boolean;
  };
}

export async function performEmergencyReset(
  tournamentId: string, 
  options: EmergencyResetOptions
): Promise<EmergencyResetResult> {
  const result: EmergencyResetResult = {
    success: false,
    message: '',
    itemsReset: {
      teams: 0,
      matches: 0,
      signups: 0,
      statusChanged: false
    }
  };

  try {
    console.log('Starting emergency reset for tournament:', tournamentId);

    // Reset teams and related data
    if (options.resetTeams) {
      // Get team IDs first
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('tournament_id', tournamentId);

      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id);

        // Delete team members
        await supabase
          .from('team_members')
          .delete()
          .in('team_id', teamIds);

        // Delete teams
        const { error: teamsError } = await supabase
          .from('teams')
          .delete()
          .eq('tournament_id', tournamentId);

        if (teamsError) throw teamsError;
        
        result.itemsReset.teams = teams.length;
        console.log(`Reset ${teams.length} teams`);
      }
    }

    // Reset matches
    if (options.resetMatches) {
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId);

      if (matches && matches.length > 0) {
        // Delete match-related data first
        const matchIds = matches.map(m => m.id);

        // Delete map veto sessions and actions
        const { data: vetoSessions } = await supabase
          .from('map_veto_sessions')
          .select('id')
          .in('match_id', matchIds);

        if (vetoSessions && vetoSessions.length > 0) {
          const sessionIds = vetoSessions.map(s => s.id);
          
          await supabase
            .from('map_veto_actions')
            .delete()
            .in('veto_session_id', sessionIds);

          await supabase
            .from('map_veto_sessions')
            .delete()
            .in('match_id', matchIds);
        }

        // Delete match result submissions
        await supabase
          .from('match_result_submissions')
          .delete()
          .in('match_id', matchIds);

        // Delete match maps
        await supabase
          .from('match_maps')
          .delete()
          .in('match_id', matchIds);

        // Delete matches
        const { error: matchesError } = await supabase
          .from('matches')
          .delete()
          .eq('tournament_id', tournamentId);

        if (matchesError) throw matchesError;
        
        result.itemsReset.matches = matches.length;
        console.log(`Reset ${matches.length} matches`);
      }
    }

    // Reset signups (careful - this removes player registrations)
    if (options.resetSignups) {
      const { data: signups, error: signupsError } = await supabase
        .from('tournament_signups')
        .delete()
        .eq('tournament_id', tournamentId)
        .select();

      if (signupsError) throw signupsError;
      
      result.itemsReset.signups = signups?.length || 0;
      console.log(`Reset ${signups?.length || 0} signups`);
    }

    // Reset tournament status
    if (options.resetStatus && options.targetStatus) {
      const { error: statusError } = await supabase
        .from('tournaments')
        .update({ status: options.targetStatus })
        .eq('id', tournamentId);

      if (statusError) throw statusError;
      
      result.itemsReset.statusChanged = true;
      console.log(`Reset status to ${options.targetStatus}`);
    }

    // Log the emergency reset action
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'tournaments',
        action: 'EMERGENCY_RESET',
        record_id: tournamentId,
        new_values: {
          reset_options: options,
          items_reset: result.itemsReset,
          timestamp: new Date().toISOString()
        }
      });

    result.success = true;
    result.message = 'Emergency reset completed successfully';
    
    return result;

  } catch (error: any) {
    console.error('Emergency reset failed:', error);
    result.success = false;
    result.message = error.message || 'Emergency reset failed';
    
    return result;
  }
}

export function getResetDescription(options: EmergencyResetOptions): string {
  const actions = [];
  
  if (options.resetTeams) actions.push('teams and team members');
  if (options.resetMatches) actions.push('matches and brackets');
  if (options.resetSignups) actions.push('player signups');
  if (options.resetStatus) actions.push(`status to ${options.targetStatus}`);
  
  if (actions.length === 0) return 'No reset actions selected';
  
  return `This will reset: ${actions.join(', ')}`;
}
