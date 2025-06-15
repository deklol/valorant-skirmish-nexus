
import { uniq, flatten } from "lodash";

type Match = {
  id: string;
  round_number: number;
  match_number: number;
  status: string;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
};

/**
 * Bracket state/health analyzer.
 * - Does NOT warn about teams progressing across rounds (that's normal!)
 * - Flags genuine issues:
 *   - Teams in next round who didn't win in prior round
 *   - Completed matches missing a winner
 *   - Teams eliminated but still present
 *   - Orphan matches (should have both teams assigned by this round)
 */
export function analyzeBracketState(matches: Match[], eliminatedTeamIds: string[] = []): {
  healthy: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!matches.length) {
    return { healthy: true, issues: [] };
  }

  // 1. Completed matches with no winner assigned
  matches
    .filter((m) => m.status === "completed" && !m.winner_id)
    .forEach((m) =>
      issues.push(`Match #${m.match_number} in Round ${m.round_number} is completed but missing winner.`)
    );

  // 2. Teams in a round missing prior win (except R1)
  const byRound: Record<number, Match[]> = {};
  for (const m of matches) {
    if (!byRound[m.round_number]) byRound[m.round_number] = [];
    byRound[m.round_number].push(m);
  }
  for (const round of Object.keys(byRound).map(Number)) {
    if (round === 1) continue;
    for (const match of byRound[round]) {
      // For T1/T2: did they come from a win in previous round?
      const prev = byRound[round - 1] || [];
      if (match.team1_id && !prev.some((pm) => pm.winner_id === match.team1_id)) {
        issues.push(
          `Team ${match.team1_id.slice(0, 6)} in R${round}M${match.match_number} was not a winner in prior round.`
        );
      }
      if (match.team2_id && !prev.some((pm) => pm.winner_id === match.team2_id)) {
        issues.push(
          `Team ${match.team2_id.slice(0, 6)} in R${round}M${match.match_number} was not a winner in prior round.`
        );
      }
    }
  }
  // 3. Teams marked eliminated but in later matches (if given)
  if (eliminatedTeamIds?.length) {
    for (const m of matches) {
      [m.team1_id, m.team2_id]
        .filter((tid) => tid && eliminatedTeamIds.includes(tid))
        .forEach((tid) =>
          issues.push(
            `Eliminated team ${tid!.slice(0, 6)} is present in R${m.round_number}M${m.match_number}`
          )
        );
    }
  }

  // 4. Orphan matches: after round 1, matches missing both teams when bracket should progress
  const maxRound = Math.max(...Object.keys(byRound).map(Number));
  for (let r = 2; r <= maxRound; r++) {
    for (const m of byRound[r] || []) {
      if (!m.team1_id && !m.team2_id) {
        issues.push(
          `Match #${m.match_number} in Round ${r} has no teams assigned.`
        );
      }
    }
  }

  return { healthy: issues.length === 0, issues };
}
