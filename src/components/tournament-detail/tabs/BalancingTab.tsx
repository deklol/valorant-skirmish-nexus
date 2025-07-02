
import TeamBalancingInterface from "@/components/TeamBalancingInterface";
import SubstituteWaitlistManager from "@/components/SubstituteWaitlistManager";
import ErrorBoundary from "@/components/ErrorBoundary";

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
    <ErrorBoundary componentName="BalancingTab">
      <div className="space-y-6">
        <TeamBalancingInterface
          tournamentId={tournamentId}
          maxTeams={maxTeams}
          teamSize={teamSize}
          onTeamsUpdated={onTeamsUpdated}
        />
        
        <SubstituteWaitlistManager
          tournamentId={tournamentId}
          onSubstituteChange={onTeamsUpdated}
          showAdminTools={true}
        />
      </div>
    </ErrorBoundary>
  );
}
