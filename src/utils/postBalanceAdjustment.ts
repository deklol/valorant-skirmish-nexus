/**
 * Post-balance adjustment system to prevent tournament winners from getting overpowered teams
 * This runs AFTER teams are created and makes intelligent swaps to ensure fairness
 */

export interface TeamData {
  id: string;
  name: string;
  totalPoints: number;
  members: PlayerData[];
}

export interface PlayerData {
  id: string;
  discord_username: string;
  tournaments_won?: number;
  current_rank?: string;
  peak_rank?: string;
  points: number;
  is_captain?: boolean;
}

export interface BalanceAdjustment {
  reason: string;
  swappedPlayers: {
    player1: PlayerData;
    player2: PlayerData;
    fromTeam: string;
    toTeam: string;
  };
  beforePoints: { team1: number; team2: number };
  afterPoints: { team1: number; team2: number };
  improvementScore: number;
}

/**
 * Analyzes teams and performs intelligent swaps to prevent tournament winners 
 * from dominating with overpowered teams
 */
export function adjustTeamBalance(teams: TeamData[]): {
  adjustedTeams: TeamData[];
  adjustments: BalanceAdjustment[];
  summary: string;
} {
  const adjustments: BalanceAdjustment[] = [];
  let workingTeams = JSON.parse(JSON.stringify(teams)); // Deep clone

  // Find tournament winners
  const tournamentWinners = workingTeams.flatMap(team => 
    team.members.filter(player => (player.tournaments_won || 0) > 0)
  );

  if (tournamentWinners.length === 0) {
    return {
      adjustedTeams: workingTeams,
      adjustments: [],
      summary: "No tournament winners found - no adjustments needed"
    };
  }

  // Sort teams by strength (highest points first)
  workingTeams.sort((a, b) => b.totalPoints - a.totalPoints);
  
  const strongestTeam = workingTeams[0];
  const strongestTeamWinners = strongestTeam.members.filter(p => (p.tournaments_won || 0) > 0);

  // If strongest team has tournament winners, try to fix it
  if (strongestTeamWinners.length > 0) {
    console.log(`🚨 BALANCE ISSUE DETECTED: Strongest team "${strongestTeam.name}" (${strongestTeam.totalPoints} pts) has tournament winners:`, 
      strongestTeamWinners.map(p => `${p.discord_username} (${p.tournaments_won} wins)`));

    // Try to swap tournament winners from strongest team with weaker players
    for (const winner of strongestTeamWinners) {
      const swapResult = findBestSwap(winner, strongestTeam, workingTeams);
      if (swapResult) {
        // Perform the swap
        executeSwap(workingTeams, swapResult);
        adjustments.push(swapResult);
        
        // Recalculate team points after swap
        recalculateTeamPoints(workingTeams);
        
        console.log(`✅ BALANCE ADJUSTMENT: Swapped ${swapResult.swappedPlayers.player1.discord_username} ↔ ${swapResult.swappedPlayers.player2.discord_username}`);
        break; // Only do one swap at a time to avoid over-adjusting
      }
    }
  }

  const summary = adjustments.length > 0 
    ? `Applied ${adjustments.length} balance adjustment(s) to prevent tournament winner advantages`
    : "Teams are already balanced - no adjustments needed";

  return {
    adjustedTeams: workingTeams,
    adjustments,
    summary
  };
}

/**
 * Finds the best player to swap with a tournament winner to improve balance
 */
function findBestSwap(tournamentWinner: PlayerData, strongTeam: TeamData, allTeams: TeamData[]): BalanceAdjustment | null {
  let bestSwap: BalanceAdjustment | null = null;
  let bestImprovementScore = 0;

  // Don't swap captains to avoid breaking team structure
  if (tournamentWinner.is_captain) {
    return null;
  }

  for (const team of allTeams) {
    if (team.id === strongTeam.id) continue; // Skip same team

    for (const player of team.members) {
      // Don't swap captains or other tournament winners
      if (player.is_captain || (player.tournaments_won || 0) > 0) continue;

      // Calculate point difference and improvement score
      const pointDiff = tournamentWinner.points - player.points;
      
      // We want to move high-point tournament winners to weaker teams
      // And move lower-point players to stronger teams
      if (pointDiff > 0) {
        const beforeGap = Math.abs(strongTeam.totalPoints - team.totalPoints);
        const afterStrongPoints = strongTeam.totalPoints - pointDiff;
        const afterWeakPoints = team.totalPoints + pointDiff;
        const afterGap = Math.abs(afterStrongPoints - afterWeakPoints);
        
        const improvement = beforeGap - afterGap;
        
        if (improvement > bestImprovementScore) {
          bestImprovementScore = improvement;
          bestSwap = {
            reason: `Preventing tournament winner ${tournamentWinner.discord_username} (${tournamentWinner.tournaments_won} wins) from being on strongest team`,
            swappedPlayers: {
              player1: tournamentWinner,
              player2: player,
              fromTeam: strongTeam.name,
              toTeam: team.name
            },
            beforePoints: {
              team1: strongTeam.totalPoints,
              team2: team.totalPoints
            },
            afterPoints: {
              team1: afterStrongPoints,
              team2: afterWeakPoints
            },
            improvementScore: improvement
          };
        }
      }
    }
  }

  return bestSwap;
}

/**
 * Executes a player swap between teams
 */
function executeSwap(teams: TeamData[], swap: BalanceAdjustment): void {
  const { player1, player2 } = swap.swappedPlayers;
  
  // Find teams
  const team1 = teams.find(t => t.members.some(p => p.id === player1.id));
  const team2 = teams.find(t => t.members.some(p => p.id === player2.id));
  
  if (!team1 || !team2) return;

  // Remove players from their current teams
  team1.members = team1.members.filter(p => p.id !== player1.id);
  team2.members = team2.members.filter(p => p.id !== player2.id);

  // Add players to their new teams
  team1.members.push(player2);
  team2.members.push(player1);
}

/**
 * Recalculates total points for all teams after swaps
 */
function recalculateTeamPoints(teams: TeamData[]): void {
  teams.forEach(team => {
    team.totalPoints = team.members.reduce((sum, player) => sum + player.points, 0);
  });
}