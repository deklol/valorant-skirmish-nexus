
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Map, Trophy, Clock, Eye } from "lucide-react";
import { formatDate } from "@/hooks/useTournamentUtils";
import { useTournamentPageViews } from "@/hooks/useTournamentPageViews";

export default function TournamentInfoCards({ tournament, parsedMapVetoRounds }: { tournament: any, parsedMapVetoRounds: number[] }) {
  const { pageViews } = useTournamentPageViews(tournament?.id);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Tournament Information Card */}
      <Card className="bg-slate-800/90 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">Tournament Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-400">Format</div>
              <div className="text-white">{tournament.bracket_type?.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Team Size</div>
              <div className="text-white">{tournament.team_size}v{tournament.team_size}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Max Teams</div>
              <div className="text-white">{tournament.max_teams}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Max Players</div>
              <div className="text-white">{tournament.max_players}</div>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-sm text-slate-400">Page Views</div>
                <div className="text-white font-semibold">{pageViews.toLocaleString()}</div>
              </div>
            </div>
          </div>
          {tournament.enable_map_veto && (
            <div>
              <div className="text-sm text-slate-400">Map Veto</div>
              <div className="text-white">Enabled</div>
              {parsedMapVetoRounds.length > 0 && (
                <div className="text-sm text-slate-500">
                  Required rounds: {parsedMapVetoRounds.join(', ')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Timeline Card */}
      <Card className="bg-slate-800/90 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-sm text-slate-400">Registration Opens</div>
                <div className="text-white text-sm">{formatDate(tournament.registration_opens_at)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-sm text-slate-400">Registration Closes</div>
                <div className="text-white text-sm">{formatDate(tournament.registration_closes_at)}</div>
              </div>
            </div>
            {tournament.check_in_required && (
              <>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">Check-in Starts</div>
                    <div className="text-white text-sm">{formatDate(tournament.check_in_starts_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">Check-in Ends</div>
                    <div className="text-white text-sm">{formatDate(tournament.check_in_ends_at)}</div>
                  </div>
                </div>
              </>
            )}
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-sm text-slate-400">Tournament Starts</div>
                <div className="text-white text-sm">{formatDate(tournament.start_time)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
