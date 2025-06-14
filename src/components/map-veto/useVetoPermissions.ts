
import { useMemo } from "react";

/**
 * Encapsulate all permission logic for a map veto session.
 */
export function useVetoPermissions({
  userTeamId,
  currentTurnTeamId,
  isUserCaptain,
  teamSize,
  team1Id,
  team2Id,
}: {
  userTeamId: string | null;
  currentTurnTeamId: string;
  isUserCaptain?: boolean;
  teamSize?: number | null;
  team1Id?: string | null;
  team2Id?: string | null;
}) {
  // Is user on one of match teams
  const isUserOnMatchTeam = useMemo(
    () => !!userTeamId && (userTeamId === team1Id || userTeamId === team2Id),
    [userTeamId, team1Id, team2Id]
  );
  // Is it user's team's turn
  const isUserTeamTurn = useMemo(
    () => isUserOnMatchTeam && userTeamId === currentTurnTeamId && !!userTeamId,
    [isUserOnMatchTeam, userTeamId, currentTurnTeamId]
  );
  // Is user eligible (captain or 1v1)
  const isUserEligible = useMemo(
    () =>
      isUserTeamTurn &&
      ((teamSize === 1) ||
        (teamSize && teamSize > 1 && isUserCaptain)),
    [isUserTeamTurn, teamSize, isUserCaptain]
  );

  function explainPermissions() {
    if (!isUserOnMatchTeam)
      return {
        ok: false,
        reason: "You are not a member of either team in this match.",
      };
    if (!isUserTeamTurn)
      return {
        ok: false,
        reason: "It's not your team's turn to act. Wait for your team’s turn.",
      };
    if (!isUserEligible)
      return {
        ok: false,
        reason:
          teamSize === 1
            ? "Eligibility error (should not happen in 1v1)"
            : "Only the team captain can veto maps in team games.",
      };
    return { ok: true, reason: null };
  }

  return {
    isUserOnMatchTeam,
    isUserTeamTurn,
    isUserEligible,
    explainPermissions,
  };
}
