
import TournamentBalanceTransparency from "../TournamentBalanceTransparency";

export default function BalancingTab({
  tournament,
  teams
}: {
  tournament: any,
  teams: any[]
}) {
  // Show balance analysis if available
  if (!tournament?.balance_analysis) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No balance analysis available</p>
          <p className="text-sm text-muted-foreground">Teams were not auto-balanced for this tournament</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TournamentBalanceTransparency 
        balanceAnalysis={tournament.balance_analysis}
        teams={teams}
      />
    </div>
  );
}
