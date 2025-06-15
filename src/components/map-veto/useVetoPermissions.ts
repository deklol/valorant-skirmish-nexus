
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
  seq // NEW: allow recalculation after RT update
}: {
  userTeamId: string | null;
  currentTurnTeamId: string;
  isUserCaptain?: boolean;
  teamSize?: number | null;
  team1Id?: string | null;
  team2Id?: string | null;
  seq?: number; // New: each time this changes, force recalculation
}) {
  // Is user on one of match teams
  const isUserOnMatchTeam = useMemo(
    () => {
      const onMatchTeam = !!userTeamId && (userTeamId === team1Id || userTeamId === team2Id);
      // Debug
      console.log("[useVetoPermissions] userTeamId:", userTeamId, "team1Id:", team1Id, "team2Id:", team2Id, "onMatchTeam:", onMatchTeam, "seq:", seq);
      return onMatchTeam;
    },
    [userTeamId, team1Id, team2Id, seq] // seq => force recalculation
  );
  // Is it user's team's turn
  const isUserTeamTurn = useMemo(
    () => {
      const turn = isUserOnMatchTeam && userTeamId === currentTurnTeamId && !!userTeamId;
      console.log("[useVetoPermissions] userTeamTurn? currentTurnTeamId:", currentTurnTeamId, "turn:", turn, "seq:", seq);
      return turn;
    },
    [isUserOnMatchTeam, userTeamId, currentTurnTeamId, seq]
  );
  // Is user eligible (captain or 1v1)
  const isUserEligible = useMemo(
    () =>
      isUserTeamTurn &&
      ((teamSize === 1) ||
        (teamSize && teamSize > 1 && isUserCaptain)),
    [isUserTeamTurn, teamSize, isUserCaptain, seq]
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

  // Debug trace at each permissions calculation
  console.log("[useVetoPermissions::TRACE]", {
    seq,
    userTeamId,
    currentTurnTeamId,
    isUserCaptain,
    teamSize,
    team1Id,
    team2Id,
    isUserOnMatchTeam,
    isUserTeamTurn,
    isUserEligible,
  });

  return {
    isUserOnMatchTeam,
    isUserTeamTurn,
    isUserEligible,
    explainPermissions,
  };
}

