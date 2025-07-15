import SubstituteWaitlistManager from "@/components/SubstituteWaitlistManager";
import ErrorBoundary from "@/components/ErrorBoundary";
import EnhancedTeamBalancingTool from "@/components/team-balancing/EnhancedTeamBalancingTool";

export default function BalancingTab({
  tournament,
  maxTeams,
  teamSize,
  onTeamsUpdated
}: {
  tournament: { id: string }, // expand this if you have a proper Tournament type
  maxTeams: number,
  teamSize: number,
  onTeamsUpdated: () => void
}) {
  return (
    <ErrorBoundary componentName="BalancingTab">
      <div className="space-y-6">
        {/* Enhanced Auto-Balancing Tool */}
        <EnhancedTeamBalancingTool
          tournamentId={tournament.id}
          maxTeams={maxTeams}
          onTeamsBalanced={onTeamsUpdated}
        />
        
        <SubstituteWaitlistManager
          tournamentId={tournament.id}
          onSubstituteChange={onTeamsUpdated}
          showAdminTools={true}
        />
      </div>
    </ErrorBoundary>
  );
}
