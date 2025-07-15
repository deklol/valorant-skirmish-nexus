
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Eye, AlertTriangle } from "lucide-react";
import { useTournamentPageViews } from "@/hooks/useTournamentPageViews";

interface MatchInformationProps {
  scheduledTime: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  winnerId: string | null;
  team1Id: string | null;
  team2Id: string | null;
  team1Name: string;
  team2Name: string;
  tournamentId?: string;
  notes?: string | null;
}

const MatchInformation = ({
  scheduledTime,
  status,
  startedAt,
  completedAt,
  winnerId,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  tournamentId,
  notes
}: MatchInformationProps) => {
  const { pageViews } = useTournamentPageViews(tournamentId);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'live':
        return <Badge className="bg-green-600">Live</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600">Completed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Match Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-400">Scheduled Time</div>
            <div className="text-white">
              {scheduledTime ? new Date(scheduledTime).toLocaleString() : 'Not scheduled'}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Status</div>
            <div className="text-white">{getStatusBadge(status)}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Tournament Views
            </div>
            <div className="text-white">{pageViews.toLocaleString()}</div>
          </div>
          {startedAt && (
            <div>
              <div className="text-sm text-slate-400">Started</div>
              <div className="text-white">{new Date(startedAt).toLocaleString()}</div>
            </div>
          )}
          {completedAt && (
            <div>
              <div className="text-sm text-slate-400">Completed</div>
              <div className="text-white">{new Date(completedAt).toLocaleString()}</div>
            </div>
          )}
        </div>

        {winnerId && (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="text-green-400 font-medium">Winner:</div>
            <div className="text-white text-lg">
              {winnerId === team1Id ? team1Name : team2Name}
            </div>
          </div>
        )}

        {notes && (
          <div className="mt-4 p-4 bg-amber-900/20 border border-amber-700 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Administrative Notes
            </div>
            <div className="text-slate-200 text-sm leading-relaxed">
              {notes}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchInformation;
