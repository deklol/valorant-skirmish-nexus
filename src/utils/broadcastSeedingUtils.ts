/**
 * Utility functions for calculating proper broadcast seeding based on team weights
 * Higher weight = Higher seed (Seed #1 = highest weight team)
 */

interface TeamForSeeding {
  id: string;
  name: string;
  total_rank_points: number;
  seed?: number; // Database seed for reference
}

/**
 * Calculate proper seeding based on team weights
 * @param teams Array of teams with total_rank_points
 * @returns Teams sorted by weight (highest first) with calculated seeds
 */
export function calculateBroadcastSeeds<T extends TeamForSeeding>(teams: T[]): (T & { calculatedSeed: number })[] {
  // Sort teams by total_rank_points descending (highest weight first)
  const sortedTeams = [...teams].sort((a, b) => (b.total_rank_points || 0) - (a.total_rank_points || 0));
  
  // Assign calculated seeds (1 = highest weight)
  return sortedTeams.map((team, index) => ({
    ...team,
    calculatedSeed: index + 1
  }));
}

/**
 * Get the calculated seed for a specific team
 * @param teams Array of teams
 * @param teamId ID of the team to find seed for
 * @returns Calculated seed number (1-based)
 */
export function getCalculatedSeedForTeam(teams: TeamForSeeding[], teamId: string): number {
  const teamsWithSeeds = calculateBroadcastSeeds(teams);
  const team = teamsWithSeeds.find(t => t.id === teamId);
  return team?.calculatedSeed || 0;
}

/**
 * Format seed display text
 * @param seed Seed number
 * @returns Formatted seed text (e.g., "Seed #1")
 */
export function formatSeedDisplay(seed: number): string {
  return `Seed #${seed}`;
}