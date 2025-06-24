
/**
 * Map Veto System Audit Utilities
 * Comprehensive validation and health checks for the map veto system
 */

import { supabase } from "@/integrations/supabase/client";

export interface VetoAuditResult {
  isHealthy: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
  sessionCount: number;
  completedSessions: number;
  activeSession?: any;
}

export interface VetoSessionHealth {
  sessionId: string;
  status: string;
  issues: string[];
  actionCount: number;
  expectedActions: number;
  isStuck: boolean;
  lastActivity: string;
}

/**
 * Comprehensive audit of the map veto system
 */
export async function auditMapVetoSystem(tournamentId?: string): Promise<VetoAuditResult> {
  const result: VetoAuditResult = {
    isHealthy: true,
    issues: [],
    warnings: [],
    recommendations: [],
    sessionCount: 0,
    completedSessions: 0
  };

  try {
    // Get all veto sessions (filtered by tournament if provided)
    let sessionQuery = supabase
      .from('map_veto_sessions')
      .select(`
        *,
        matches!inner(tournament_id, team1_id, team2_id, best_of)
      `);

    if (tournamentId) {
      sessionQuery = sessionQuery.eq('matches.tournament_id', tournamentId);
    }

    const { data: sessions, error: sessionsError } = await sessionQuery;

    if (sessionsError) {
      result.issues.push(`Failed to fetch veto sessions: ${sessionsError.message}`);
      result.isHealthy = false;
      return result;
    }

    result.sessionCount = sessions?.length || 0;
    result.completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;

    // Check each session for issues
    for (const session of sessions || []) {
      const sessionHealth = await auditVetoSession(session.id);
      
      if (!sessionHealth.isStuck && sessionHealth.issues.length === 0) continue;

      if (sessionHealth.isStuck) {
        result.issues.push(`Session ${session.id.slice(0,8)} is stuck: ${sessionHealth.issues.join(', ')}`);
        result.isHealthy = false;
      } else if (sessionHealth.issues.length > 0) {
        result.warnings.push(`Session ${session.id.slice(0,8)} has issues: ${sessionHealth.issues.join(', ')}`);
      }
    }

    // System-wide checks
    await performSystemWideVetoChecks(result);

    // Generate recommendations
    generateVetoRecommendations(result);

    console.log('🔍 Map Veto Audit Complete:', {
      sessions: result.sessionCount,
      completed: result.completedSessions,
      issues: result.issues.length,
      warnings: result.warnings.length
    });

  } catch (error: any) {
    result.issues.push(`Audit failed: ${error.message}`);
    result.isHealthy = false;
  }

  return result;
}

/**
 * Audit a specific veto session for health issues
 */
export async function auditVetoSession(sessionId: string): Promise<VetoSessionHealth> {
  const health: VetoSessionHealth = {
    sessionId,
    status: 'unknown',
    issues: [],
    actionCount: 0,
    expectedActions: 0,
    isStuck: false,
    lastActivity: 'never'
  };

  try {
    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('map_veto_sessions')
      .select(`
        *,
        matches!inner(tournament_id, team1_id, team2_id, best_of),
        tournaments!inner(map_pool)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      health.issues.push('Session not found');
      return health;
    }

    health.status = session.status;
    health.lastActivity = session.updated_at || session.created_at;

    // Get all actions for this session
    const { data: actions, error: actionsError } = await supabase
      .from('map_veto_actions')
      .select('*')
      .eq('veto_session_id', sessionId)
      .order('order_number');

    if (actionsError) {
      health.issues.push(`Failed to fetch actions: ${actionsError.message}`);
      return health;
    }

    health.actionCount = actions?.length || 0;

    // Calculate expected actions based on tournament map pool
    const mapPool = session.tournaments?.map_pool || [];
    const mapCount = Array.isArray(mapPool) ? mapPool.length : 0;
    
    if (mapCount === 0) {
      health.issues.push('Tournament has no map pool defined');
      return health;
    }

    // For BO1: expect (mapCount - 1) bans + 1 pick + 1 side choice = mapCount + 1
    health.expectedActions = mapCount + 1;

    // Check for stuck sessions
    if (session.status === 'in_progress') {
      const lastActionTime = actions?.[actions.length - 1]?.performed_at;
      const timeSinceLastAction = lastActionTime ? 
        Date.now() - new Date(lastActionTime).getTime() : 
        Date.now() - new Date(session.created_at).getTime();

      // Consider stuck if no activity for 30+ minutes
      if (timeSinceLastAction > 30 * 60 * 1000) {
        health.isStuck = true;
        health.issues.push(`No activity for ${Math.round(timeSinceLastAction / 60000)} minutes`);
      }
    }

    // Validate action sequence
    if (actions && actions.length > 0) {
      const banActions = actions.filter(a => a.action === 'ban');
      const pickActions = actions.filter(a => a.action === 'pick');
      
      // Check for duplicate map actions
      const mapIds = actions.map(a => a.map_id).filter(Boolean);
      const uniqueMaps = new Set(mapIds);
      if (mapIds.length !== uniqueMaps.size) {
        health.issues.push('Duplicate map actions detected');
      }

      // Check for invalid maps (not in tournament pool)
      for (const action of actions) {
        if (action.map_id && !mapPool.includes(action.map_id)) {
          health.issues.push(`Action contains map not in tournament pool: ${action.map_id}`);
        }
      }

      // BO1 specific checks
      if (session.matches?.best_of === 1) {
        const expectedBans = mapCount - 1;
        if (banActions.length > expectedBans) {
          health.issues.push(`Too many bans: ${banActions.length}, expected: ${expectedBans}`);
        }
        if (pickActions.length > 1) {
          health.issues.push(`Too many picks for BO1: ${pickActions.length}`);
        }
      }
    }

    // Check team assignments
    if (!session.home_team_id || !session.away_team_id) {
      health.issues.push('Missing team assignments');
    }

    if (session.home_team_id === session.away_team_id) {
      health.issues.push('Home and away teams are the same');
    }

  } catch (error: any) {
    health.issues.push(`Session audit failed: ${error.message}`);
  }

  return health;
}

/**
 * Perform system-wide veto checks
 */
async function performSystemWideVetoChecks(result: VetoAuditResult) {
  try {
    // Check for orphaned veto sessions (no match)
    const { data: orphanedSessions, error: orphanError } = await supabase
      .from('map_veto_sessions')
      .select('id, match_id')
      .is('match_id', null);

    if (orphanError) {
      result.warnings.push(`Failed to check for orphaned sessions: ${orphanError.message}`);
    } else if (orphanedSessions && orphanedSessions.length > 0) {
      result.warnings.push(`Found ${orphanedSessions.length} orphaned veto sessions without matches`);
    }

    // Check for matches with multiple veto sessions
    const { data: matchSessions, error: matchError } = await supabase
      .from('map_veto_sessions')
      .select('match_id')
      .not('match_id', 'is', null);

    if (!matchError && matchSessions) {
      const matchCounts = matchSessions.reduce((acc, session) => {
        acc[session.match_id] = (acc[session.match_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const duplicateMatches = Object.entries(matchCounts).filter(([_, count]) => count > 1);
      if (duplicateMatches.length > 0) {
        result.warnings.push(`Found ${duplicateMatches.length} matches with multiple veto sessions`);
      }
    }

    // Check for active maps
    const { data: activeMaps, error: mapsError } = await supabase
      .from('maps')
      .select('id')
      .eq('is_active', true);

    if (!mapsError && activeMaps) {
      if (activeMaps.length === 0) {
        result.issues.push('No active maps found - map veto cannot function');
        result.isHealthy = false;
      } else if (activeMaps.length < 3) {
        result.warnings.push(`Only ${activeMaps.length} active maps - recommend at least 3 for proper veto`);
      }
    }

  } catch (error: any) {
    result.warnings.push(`System-wide checks failed: ${error.message}`);
  }
}

/**
 * Generate recommendations based on audit results
 */
function generateVetoRecommendations(result: VetoAuditResult) {
  if (result.sessionCount === 0) {
    result.recommendations.push('No veto sessions found - system appears unused');
    return;
  }

  const completionRate = result.completedSessions / result.sessionCount;
  
  if (completionRate < 0.8) {
    result.recommendations.push('Low veto completion rate - consider investigating stuck sessions');
  }

  if (result.issues.length > result.warnings.length * 2) {
    result.recommendations.push('High issue-to-warning ratio - consider implementing automated cleanup');
  }

  if (result.issues.length === 0 && result.warnings.length === 0) {
    result.recommendations.push('Map veto system appears healthy - no immediate action required');
  }

  // Always recommend monitoring
  result.recommendations.push('Regular monitoring recommended for optimal veto system performance');
}

/**
 * Clean up stuck or problematic veto sessions
 */
export async function cleanupVetoSessions(sessionIds: string[]) {
  const results = {
    cleaned: 0,
    errors: [] as string[]
  };

  for (const sessionId of sessionIds) {
    try {
      // Reset stuck sessions to pending status
      const { error } = await supabase
        .from('map_veto_sessions')
        .update({ 
          status: 'pending',
          current_turn_team_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        results.errors.push(`Failed to clean session ${sessionId}: ${error.message}`);
      } else {
        results.cleaned++;
      }
    } catch (error: any) {
      results.errors.push(`Error cleaning session ${sessionId}: ${error.message}`);
    }
  }

  return results;
}
