
import TournamentInfoCards from "../TournamentInfoCards";
export default function OverviewTab({ tournament, parsedMapVetoRounds }: { tournament: any, parsedMapVetoRounds: number[] }) {
  return (
    <div className="space-y-6">
      <TournamentInfoCards tournament={tournament} parsedMapVetoRounds={parsedMapVetoRounds} />
    </div>
  );
}
