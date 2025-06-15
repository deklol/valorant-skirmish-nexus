
import TeamBalancingInterface from "@/components/TeamBalancingInterface";
export default function BalancingTab({
  tournamentId,
  maxTeams,
  teamSize,
  onTeamsUpdated
}: {
  tournamentId: string,
  maxTeams: number,
  teamSize: number,
  onTeamsUpdated: () => void
}) {
  return (
    <TeamBalancingInterface
      tournamentId={tournamentId}
      maxTeams={maxTeams}
      teamSize={teamSize}
      onTeamsUpdated={onTeamsUpdated}
    />
  );
}
