
import TournamentInfoCards from "../TournamentInfoCards";
import TournamentBalanceTransparency from "../TournamentBalanceTransparency";

export default function OverviewTab({ 
  tournament, 
  parsedMapVetoRounds, 
  teams 
}: { 
  tournament: any, 
  parsedMapVetoRounds: number[], 
  teams?: any[] 
}) {
  return (
    <div className="space-y-6">
      <TournamentInfoCards tournament={tournament} parsedMapVetoRounds={parsedMapVetoRounds} />
      
      {/* Balance Analysis Section - Full Width */}
      {tournament?.balance_analysis && teams && (
        <TournamentBalanceTransparency 
          balanceAnalysis={tournament.balance_analysis as any}
          teams={teams}
        />
      )}
    </div>
  );
}
