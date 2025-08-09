
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LivePageViewCounter from "@/components/LivePageViewCounter";
import { getStatusBadge } from "@/hooks/useTournamentUtils";
import { AspectRatio } from "@/components/ui/aspect-ratio";

type Props = {
  tournament: any;
};

export default function TournamentHeader({ tournament }: Props) {
  return (
    <Card className="bg-slate-800/90 border-slate-700 mb-6">
      <CardContent className="p-4">
        {tournament.banner_image_url && (
          <div className="mb-3 overflow-hidden rounded">
            <AspectRatio ratio={16 / 9}>
              <img
                src={tournament.banner_image_url}
                alt={`${tournament.name} banner`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </AspectRatio>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-white mb-1">{tournament.name}</CardTitle>
            {tournament.description && (
              <p className="text-slate-300 text-sm">{tournament.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <LivePageViewCounter tournamentId={tournament.id} />
            {getStatusBadge(tournament.status)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
