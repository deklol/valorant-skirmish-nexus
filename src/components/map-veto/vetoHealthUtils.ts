// Minimal health utilities for VetoMedic functionality
export interface HealthStatus {
  isHealthy: boolean;
  issues: string[];
  warnings: string[];
  isStuck: boolean;
  actionCount: number;
  expectedActions: number;
  lastActivity: string | null;
}

export async function checkVetoSessionHealth(session: any): Promise<HealthStatus> {
  const actionCount = session.actions?.length || 0;
  const mapPoolSize = 7; // Default assumption
  const expectedActions = mapPoolSize - 1;
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Basic health checks
  if (!session.match?.team1_id || !session.match?.team2_id) {
    issues.push("Missing team assignments");
  }
  
  if (session.home_team_id && session.away_team_id && session.home_team_id === session.away_team_id) {
    issues.push("Home and away teams are the same");
  }
  
  if (session.status === 'completed' && actionCount < expectedActions) {
    issues.push("Session marked complete but missing actions");
  }
  
  if (session.status === 'in_progress' && actionCount === 0) {
    warnings.push("No actions taken yet");
  }
  
  const isStuck = session.status === 'in_progress' && actionCount === 0;
  const lastActivity = session.actions?.length > 0 ? session.actions[session.actions.length - 1]?.performed_at : null;
  
  return {
    isHealthy: issues.length === 0,
    issues,
    warnings,
    isStuck,
    actionCount,
    expectedActions,
    lastActivity
  };
}