/**
 * Anti-Stacking Validation System
 * Ensures highest weight players are never concentrated on the strongest teams
 */

export interface AntiStackingResult {
  isValid: boolean;
  violations: Array<{
    playerName: string;
    playerWeight: number;
    teamIndex: number;
    teamTotal: number;
    violationType: 'highest_on_strongest' | 'elite_concentration' | 'skill_stacking';
    severity: 'critical' | 'warning';
    recommendation: string;
  }>;
  highestWeightPlayerTeam: {
    playerName: string;
    weight: number;
    teamIndex: number;
    teamTotal: number;
  } | null;
  strongestTeamIndex: number;
  teamTotals: number[];
}

/**
 * Validates team compositions to ensure no anti-stacking violations
 */
export function validateAntiStacking(teams: any[][]): AntiStackingResult {
  if (teams.length === 0 || teams.every(team => team.length === 0)) {
    return {
      isValid: true,
      violations: [],
      highestWeightPlayerTeam: null,
      strongestTeamIndex: -1,
      teamTotals: []
    };
  }

  // Calculate team totals
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => sum + (player.evidenceWeight || player.adaptiveWeight || 150), 0)
  );

  // Find strongest team
  const strongestTeamIndex = teamTotals.indexOf(Math.max(...teamTotals));

  // Find highest weight player
  let highestWeightPlayer = null;
  let highestWeight = 0;
  let highestPlayerTeamIndex = -1;

  teams.forEach((team, teamIndex) => {
    team.forEach(player => {
      const weight = player.evidenceWeight || player.adaptiveWeight || 150;
      if (weight > highestWeight) {
        highestWeight = weight;
        highestWeightPlayer = player;
        highestPlayerTeamIndex = teamIndex;
      }
    });
  });

  const violations: AntiStackingResult['violations'] = [];

  // CRITICAL: Check if highest weight player is on strongest team
  if (highestWeightPlayer && highestPlayerTeamIndex === strongestTeamIndex && teams.length > 1) {
    violations.push({
      playerName: highestWeightPlayer.discord_username || 'Unknown',
      playerWeight: highestWeight,
      teamIndex: highestPlayerTeamIndex,
      teamTotal: teamTotals[highestPlayerTeamIndex],
      violationType: 'highest_on_strongest',
      severity: 'critical',
      recommendation: `Move ${highestWeightPlayer.discord_username || 'player'} to a weaker team to prevent skill concentration`
    });
  }

  // Check for elite player concentration (multiple elite players on same team)
  teams.forEach((team, teamIndex) => {
    const elitePlayers = team.filter(player => {
      const weight = player.evidenceWeight || player.adaptiveWeight || 150;
      return weight >= 400 || player.isElite;
    });

    if (elitePlayers.length > 1) {
      elitePlayers.forEach(player => {
        violations.push({
          playerName: player.discord_username || 'Unknown',
          playerWeight: player.evidenceWeight || player.adaptiveWeight || 150,
          teamIndex,
          teamTotal: teamTotals[teamIndex],
          violationType: 'elite_concentration',
          severity: 'warning',
          recommendation: `Redistribute elite players to ensure no more than 1 per team`
        });
      });
    }
  });

  // Check for general skill stacking (team has multiple high-value players)
  teams.forEach((team, teamIndex) => {
    const highValuePlayers = team.filter(player => {
      const weight = player.evidenceWeight || player.adaptiveWeight || 150;
      return weight >= 300;
    });

    if (highValuePlayers.length > 2) {
      violations.push({
        playerName: `Team ${teamIndex + 1} (${highValuePlayers.length} high-value players)`,
        playerWeight: teamTotals[teamIndex],
        teamIndex,
        teamTotal: teamTotals[teamIndex],
        violationType: 'skill_stacking',
        severity: 'warning',
        recommendation: `Redistribute high-value players to achieve better balance`
      });
    }
  });

  return {
    isValid: violations.length === 0,
    violations,
    highestWeightPlayerTeam: highestWeightPlayer ? {
      playerName: highestWeightPlayer.discord_username || 'Unknown',
      weight: highestWeight,
      teamIndex: highestPlayerTeamIndex,
      teamTotal: teamTotals[highestPlayerTeamIndex]
    } : null,
    strongestTeamIndex,
    teamTotals
  };
}

/**
 * Logs anti-stacking validation results for debugging
 */
export function logAntiStackingResults(result: AntiStackingResult, context: string = '') {
  if (result.isValid) {
    console.log(`✅ ${context} Anti-stacking validation PASSED`);
    return;
  }

  console.log(`❌ ${context} Anti-stacking validation FAILED`);
  
  result.violations.forEach(violation => {
    const severityIcon = violation.severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${severityIcon} ${violation.violationType.toUpperCase()}: ${violation.playerName} (${violation.playerWeight}pts) on Team ${violation.teamIndex + 1} (${violation.teamTotal}pts total)`);
    console.log(`   → ${violation.recommendation}`);
  });

  if (result.highestWeightPlayerTeam) {
    const isOnStrongest = result.highestWeightPlayerTeam.teamIndex === result.strongestTeamIndex;
    console.log(`📊 Highest weight player: ${result.highestWeightPlayerTeam.playerName} (${result.highestWeightPlayerTeam.weight}pts) on Team ${result.highestWeightPlayerTeam.teamIndex + 1} ${isOnStrongest ? '❌ (STRONGEST TEAM)' : '✅'}`);
  }

  console.log(`📊 Team totals: ${result.teamTotals.map((total, index) => `Team ${index + 1}: ${total}pts`).join(', ')}`);
}