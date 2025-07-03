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
  private currentState: VetoState | null = null;
  private listeners: Array<(state: VetoState) => void> = [];

  static getInstance(): VetoStateService {
    if (!VetoStateService.instance) {
      VetoStateService.instance = new VetoStateService();
    }
    return VetoStateService.instance;
  }

  // Subscribe to state changes
  subscribe(listener: (state: VetoState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of state change
  private notifyListeners() {
    if (this.currentState) {
      this.listeners.forEach(listener => listener(this.currentState!));
    }
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
      if (i % 2 === 0) { // Even positions after initial 3: home
        sequence.push(homeTeamId);
      } else { // Odd positions after initial 3: away
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

  // Load and calculate initial state
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

      // Calculate complete state
      this.currentState = this.calculateState(sessionData, actions || [], userTeamId, totalMaps);
      
      console.log('✅ VetoService: State calculated', {
        currentPosition: this.currentState.currentPosition,
        expectedTurn: this.currentState.expectedTurnTeamId?.slice(0, 8),
        currentTurn: this.currentState.currentTurnTeamId?.slice(0, 8),
        isUsersTurn: this.currentState.isUsersTurn,
        canUserAct: this.currentState.canUserAct,
        turnError: this.currentState.turnError
      });

      this.notifyListeners();
      return this.currentState;
    } catch (error) {
      console.error('❌ VetoService: Failed to load state:', error);
      throw error;
    }
  }

  // Get current state (cached)
  getCurrentState(): VetoState | null {
    return this.currentState;
  }

  // Perform a veto action with proper validation
  async performAction(mapId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentState) {
      return { success: false, error: 'No veto state loaded' };
    }

    if (!this.currentState.canUserAct) {
      return { 
        success: false, 
        error: this.currentState.turnError || 'Not your turn to act' 
      };
    }

    try {
      console.log('🎯 VetoService: Performing action', {
        mapId: mapId.slice(0, 8),
        expectedTeam: this.currentState.expectedTurnTeamId?.slice(0, 8),
        position: this.currentState.currentPosition
      });

      const { data, error } = await supabase.rpc('perform_veto_action', {
        p_veto_session_id: this.currentState.sessionId,
        p_user_id: userId,
        p_team_id: this.currentState.expectedTurnTeamId, // Use expected team, not current
        p_map_id: mapId
      });

      if (error) throw error;
      if (data !== 'OK') {
        return { success: false, error: data };
      }

      // Refresh state after successful action
      await this.refreshState();
      return { success: true };
    } catch (error: any) {
      console.error('❌ VetoService: Action failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Refresh state from database
  async refreshState(): Promise<void> {
    if (!this.currentState) return;
    
    // Re-load with the same session and user team
    const userTeamId = this.currentState.isUsersTurn ? this.currentState.expectedTurnTeamId : null;
    await this.loadState(this.currentState.sessionId, userTeamId);
  }

  // Handle realtime updates
  handleRealtimeUpdate(payload: any): void {
    if (!this.currentState) return;

    console.log('🔄 VetoService: Realtime update received', payload.eventType);
    
    // Always refresh state to ensure consistency
    this.refreshState();
  }

  // Clear state (cleanup)
  clearState(): void {
    this.currentState = null;
    this.listeners = [];
  }
}

export const vetoService = VetoStateService.getInstance();