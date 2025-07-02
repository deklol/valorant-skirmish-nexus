
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LivePageViewCounter from "@/components/LivePageViewCounter";
import { getStatusBadge } from "@/hooks/useTournamentUtils";

type Props = {
  tournament: any;
};

export default function TournamentHeader({ tournament }: Props) {
  return (
    <Card className="bg-slate-800/90 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-white">{tournament.name}</CardTitle>
            {tournament.description && (
              <p className="text-slate-300 mt-2">{tournament.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <LivePageViewCounter tournamentId={tournament.id} />
            {getStatusBadge(tournament.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-slate-300">
        {/** Info cards and details moved to TournamentInfoCards **/}
      </CardContent>
    </Card>
  );
}
