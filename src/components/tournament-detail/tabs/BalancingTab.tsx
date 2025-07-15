
import SubstituteWaitlistManager from "@/components/SubstituteWaitlistManager";
import ErrorBoundary from "@/components/ErrorBoundary";
import EnhancedTeamBalancingTool from "@/components/team-balancing/EnhancedTeamBalancingTool";

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
        {/* Enhanced Auto-Balancing Tool */}
        <EnhancedTeamBalancingTool
          tournamentId={tournamentId}
          maxTeams={maxTeams}
          onTeamsBalanced={onTeamsUpdated}
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
