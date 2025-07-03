import { supabase } from "@/integrations/supabase/client";

export interface VetoState {
  sessionId: string;
  status: 'pending' | 'in_progress' | 'completed';
  homeTeamId: string | null;
  awayTeamId: string | null;
  currentTurnTeamId: string | null;
  expectedTurnTeamId: string | null; // Calculated from ban sequence
  actions: Array<{
    id: string;
    action: 'ban' | 'pick';
    teamId: string | null;
    mapId: string;
    orderNumber: number;
    mapName?: string;
  }>;
  isUsersTurn: boolean;
  canUserAct: boolean;
  turnError: string | null;
  banSequence: string[]; // Expected team IDs in order
  currentPosition: number; // 1-indexed position in sequence
}

export class VetoStateService {
  private static instance: VetoStateService;

  static getInstance(): VetoStateService {
    if (!VetoStateService.instance) {
      VetoStateService.instance = new VetoStateService();
    }
    return VetoStateService.instance;
  }

  // Generate the expected BO1 ban sequence
  private generateBanSequence(homeTeamId: string, awayTeamId: string, totalMaps: number): string[] {
    const sequence: string[] = [];
    const totalBans = totalMaps - 1;

    // BO1 Standard: [home, away, away, home, away, home, ...]
    sequence.push(homeTeamId); // Ban 1: Home
    
    if (totalBans >= 2) {
      sequence.push(awayTeamId); // Ban 2: Away
    }
    if (totalBans >= 3) {
      sequence.push(awayTeamId); // Ban 3: Away (double ban)
    }
    
    // Continue alternating: home, away, home, away...
    for (let i = 4; i <= totalBans; i++) {
      // After initial [home, away, away], continue alternating: home, away, home, away...
      if ((i - 3) % 2 === 1) { // Odd positions after initial 3: home
        sequence.push(homeTeamId);
      } else { // Even positions after initial 3: away
        sequence.push(awayTeamId);
      }
    }

    return sequence;
  }

  // Calculate the complete veto state from raw data
  private calculateState(sessionData: any, actions: any[], userTeamId: string | null, totalMaps: number = 7): VetoState {
    const banActions = actions.filter(a => a.action === 'ban').sort((a, b) => a.order_number - b.order_number);
    const currentPosition = banActions.length + 1; // Next position to fill
    
    let banSequence: string[] = [];
    let expectedTurnTeamId: string | null = null;
    let turnError: string | null = null;

    if (sessionData.home_team_id && sessionData.away_team_id) {
      banSequence = this.generateBanSequence(sessionData.home_team_id, sessionData.away_team_id, totalMaps);
      
      // Determine who should act next based on the sequence
      if (currentPosition <= banSequence.length) {
        expectedTurnTeamId = banSequence[currentPosition - 1];
      } else if (currentPosition === banSequence.length + 1) {
        // After all bans, home team chooses side
        expectedTurnTeamId = sessionData.home_team_id;
      }

      // Check for turn sequence errors
      if (sessionData.current_turn_team_id !== expectedTurnTeamId && sessionData.status === 'in_progress') {
        const currentTeamLabel = sessionData.current_turn_team_id === sessionData.home_team_id ? 'Home' : 'Away';
        const expectedTeamLabel = expectedTurnTeamId === sessionData.home_team_id ? 'Home' : 'Away';
        turnError = `Database shows ${currentTeamLabel} team turn, but sequence expects ${expectedTeamLabel} team`;
      }
    }

    const isUsersTurn = userTeamId ? expectedTurnTeamId === userTeamId : false;
    const canUserAct = isUsersTurn && sessionData.status === 'in_progress' && !turnError;

    return {
      sessionId: sessionData.id,
      status: sessionData.status,
      homeTeamId: sessionData.home_team_id,
      awayTeamId: sessionData.away_team_id,
      currentTurnTeamId: sessionData.current_turn_team_id,
      expectedTurnTeamId,
      actions: actions.map(a => ({
        id: a.id,
        action: a.action,
        teamId: a.team_id,
        mapId: a.map_id,
        orderNumber: a.order_number,
        mapName: a.maps?.display_name || a.maps?.name
      })),
      isUsersTurn,
      canUserAct,
      turnError,
      banSequence,
      currentPosition
    };
  }

  // Load and calculate fresh state (stateless)
  async loadState(sessionId: string, userTeamId: string | null): Promise<VetoState> {
    try {
      console.log('🔄 VetoService: Loading state for session', sessionId.slice(0, 8));

      // Fetch session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('map_veto_sessions')
        .select(`
          *,
          matches!inner (
            tournament_id,
            tournaments!inner (
              map_pool
            )
          )
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Fetch actions
      const { data: actions, error: actionsError } = await supabase
        .from('map_veto_actions')
        .select(`
          *,
          maps:map_id (
            name,
            display_name
          )
        `)
        .eq('veto_session_id', sessionId)
        .order('order_number');

      if (actionsError) throw actionsError;

      // Get map pool size
      const mapPool = sessionData.matches?.tournaments?.map_pool;
      const totalMaps = mapPool ? JSON.parse(JSON.stringify(mapPool)).length : 7;

      // Calculate complete state (stateless)
      const state = this.calculateState(sessionData, actions || [], userTeamId, totalMaps);
      
      console.log('✅ VetoService: State calculated', {
        currentPosition: state.currentPosition,
        expectedTurn: state.expectedTurnTeamId?.slice(0, 8),
        currentTurn: state.currentTurnTeamId?.slice(0, 8),
        isUsersTurn: state.isUsersTurn,
        canUserAct: state.canUserAct,
        turnError: state.turnError
      });

      return state;
    } catch (error) {
      console.error('❌ VetoService: Failed to load state:', error);
      throw error;
    }
  }

  // Perform a veto action with direct database operations (stateless)
  async performAction(sessionId: string, userTeamId: string | null, mapId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Load fresh state to validate action
      const currentState = await this.loadState(sessionId, userTeamId);

      if (!currentState.canUserAct) {
        return { 
          success: false, 
          error: currentState.turnError || 'Not your turn to act' 
        };
      }

      console.log('🎯 VetoService: Performing action', {
        mapId: mapId.slice(0, 8),
        expectedTeam: currentState.expectedTurnTeamId?.slice(0, 8),
        position: currentState.currentPosition
      });

      // Validate map hasn't been used
      if (currentState.actions.some(a => a.mapId === mapId)) {
        return { success: false, error: 'Map already banned or picked' };
      }

      // Determine action type
      const actionType = currentState.currentPosition <= currentState.banSequence.length ? 'ban' : 'pick';
      
      // Perform direct database operations
      return await this.performDirectAction(currentState, mapId, userId, actionType);
    } catch (error: any) {
      console.error('❌ VetoService: Action failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Direct action with state parameter (stateless)
  private async performDirectAction(currentState: VetoState, mapId: string, userId: string, actionType: 'ban' | 'pick'): Promise<{ success: boolean; error?: string }> {
    try {
      // Insert the veto action
      const { error: actionError } = await supabase
        .from('map_veto_actions')
        .insert({
          veto_session_id: currentState.sessionId,
          map_id: mapId,
          team_id: currentState.expectedTurnTeamId,
          action: actionType,
          order_number: currentState.currentPosition,
          performed_by: userId
        });

      if (actionError) throw actionError;

      // Update session turn
      const nextTeamId = this.getNextTeamId(currentState);
      const updates: any = { current_turn_team_id: nextTeamId };

      // Check if veto is complete
      if (currentState.currentPosition >= currentState.banSequence.length) {
        // Handle auto-pick and completion
        const remainingMaps = await this.getRemainingMaps(currentState);
        if (remainingMaps.length === 1) {
          // Auto-pick final map
          await supabase
            .from('map_veto_actions')
            .insert({
              veto_session_id: currentState.sessionId,
              map_id: remainingMaps[0].id,
              team_id: null, // Auto-pick
              action: 'pick',
              order_number: currentState.currentPosition + 1,
              performed_by: null
            });

          // Set turn to home team for side choice
          updates.current_turn_team_id = currentState.homeTeamId;
        } else if (remainingMaps.length === 0) {
          // Veto complete
          updates.status = 'completed';
          updates.completed_at = new Date().toISOString();
        }
      }

      const { error: sessionError } = await supabase
        .from('map_veto_sessions')
        .update(updates)
        .eq('id', currentState.sessionId);

      if (sessionError) throw sessionError;

      return { success: true };
    } catch (error: any) {
      console.error('❌ VetoService: Direct action failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate next team in sequence (stateless)
  private getNextTeamId(currentState: VetoState): string | null {
    const nextPosition = currentState.currentPosition + 1;
    
    if (nextPosition <= currentState.banSequence.length) {
      return currentState.banSequence[nextPosition - 1];
    } else if (nextPosition === currentState.banSequence.length + 1) {
      // Side choice phase - home team chooses
      return currentState.homeTeamId;
    }
    
    return null;
  }

  // Get remaining maps from tournament pool (stateless)
  private async getRemainingMaps(currentState: VetoState): Promise<any[]> {
    try {
      const { data: sessionData } = await supabase
        .from('map_veto_sessions')
        .select('matches!inner(tournaments!inner(map_pool))')
        .eq('id', currentState.sessionId)
        .single();

      const mapPool = sessionData?.matches?.tournaments?.map_pool;
      if (!mapPool) return [];

      const usedMapIds = currentState.actions.map(a => a.mapId);
      const allMapIds = JSON.parse(JSON.stringify(mapPool));
      
      const { data: maps } = await supabase
        .from('maps')
        .select('*')
        .in('id', allMapIds.filter((id: string) => !usedMapIds.includes(id)));

      return maps || [];
    } catch (error) {
      console.error('Failed to get remaining maps:', error);
      return [];
    }
  }

  // Fix sync issues by updating database to match expected sequence (stateless)
  async fixTurnSync(sessionId: string, userTeamId: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      // Load fresh state to check for sync issues
      const currentState = await this.loadState(sessionId, userTeamId);

      if (!currentState.turnError || !currentState.expectedTurnTeamId) {
        return { success: false, error: 'No sync issue to fix' };
      }

      console.log('🔧 VetoService: Fixing turn sync', {
        expected: currentState.expectedTurnTeamId.slice(0, 8),
        current: currentState.currentTurnTeamId?.slice(0, 8)
      });

      const { error } = await supabase
        .from('map_veto_sessions')
        .update({ current_turn_team_id: currentState.expectedTurnTeamId })
        .eq('id', currentState.sessionId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('❌ VetoService: Failed to fix sync:', error);
      return { success: false, error: error.message };
    }
  }
}

export const vetoService = VetoStateService.getInstance();