
import ErrorBoundary from "@/components/ErrorBoundary";
import EnhancedTeamBalancingTool from "@/components/team-balancing/EnhancedTeamBalancingTool";

export default function BalancingTab({
  tournamentId,
  maxTeams,
  teamSize,
  onTeamsUpdated,
  tournamentName
}: {
  tournamentId: string,
  maxTeams: number,
  teamSize: number,
  onTeamsUpdated: () => void,
  tournamentName?: string
}) {
  return (
    <ErrorBoundary componentName="BalancingTab">
      <div className="space-y-6">
        {/* Enhanced Auto-Balancing Tool with Live Progress */}
        <EnhancedTeamBalancingTool
          tournamentId={tournamentId}
          maxTeams={maxTeams}
          onTeamsBalanced={onTeamsUpdated}
          tournamentName={tournamentName}
        />
      </div>
    </ErrorBoundary>
  );
}
