
import { useMemo } from "react";

/**
 * Encapsulate all permission logic for a map veto session.
 * This logic only cares that:
 *  - the user is on a match team
 *  - it is their team's turn
 *  - they are captain for their team (regardless of team size)
 */
export function useVetoPermissions({
  userTeamId,
  currentTurnTeamId,
  isUserCaptain,
  teamSize,
  team1Id,
  team2Id,
  seq // forces recalculation when incremented, if needed
}: {
  userTeamId: string | null;
  currentTurnTeamId: string;
  isUserCaptain?: boolean;
  teamSize?: number | null;
  team1Id?: string | null;
  team2Id?: string | null;
  seq?: number;
}) {
  // 1. Is user on relevant match team?
  const isUserOnMatchTeam = useMemo(() => {
    const onMatchTeam = !!userTeamId && (userTeamId === team1Id || userTeamId === team2Id);
    return onMatchTeam;
  }, [userTeamId, team1Id, team2Id, seq]);

  // 2. Is it "their team's turn"?
  const isUserTeamTurn = useMemo(() => {
    const turn = isUserOnMatchTeam && userTeamId === currentTurnTeamId && !!userTeamId;
    return turn;
  }, [isUserOnMatchTeam, userTeamId, currentTurnTeamId, seq]);

  // 3. Are they eligible? (captain required for any team-based veto action)
  // Ignore teamSize == 1: only require captain status for multi-person teams by business rules
  // But for simplicity, let's require captains only -- which will also work in 1-person teams if that's the only eligible actor
  const isUserEligible = useMemo(() => {
    // If we don't know captain status (undefined), deny
    if (typeof isUserCaptain !== "boolean") return false;
    return isUserTeamTurn && isUserCaptain;
  }, [isUserTeamTurn, isUserCaptain, seq]);

  function explainPermissions() {
    // For debugging, print all key facts
    console.log("[VETO PERMISSIONS] userTeamId:", userTeamId);
    console.log("[VETO PERMISSIONS] currentTurnTeamId:", currentTurnTeamId);
    console.log("[VETO PERMISSIONS] isUserCaptain:", isUserCaptain);
    console.log("[VETO PERMISSIONS] isUserOnMatchTeam:", isUserOnMatchTeam);
    console.log("[VETO PERMISSIONS] isUserTeamTurn:", isUserTeamTurn);
    console.log("[VETO PERMISSIONS] isUserEligible:", isUserEligible);
    // Main error ladder
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
          "Only the team captain can perform map bans or picks. Please ensure you are listed as the captain of your team.",
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

