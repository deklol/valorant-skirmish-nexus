
import TournamentInfoCards from "../TournamentInfoCards";
export default function OverviewTab({ tournament, parsedMapVetoRounds }: { tournament: any, parsedMapVetoRounds: number[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TournamentInfoCards tournament={tournament} parsedMapVetoRounds={parsedMapVetoRounds} />
    </div>
  );
}
