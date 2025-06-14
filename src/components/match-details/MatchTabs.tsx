import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import MatchScoreCards from "./MatchScoreCards";
import MatchInformation from "./MatchInformation";
import MapVetoManager from "@/components/MapVetoManager";
import ScoreReporting from "@/components/ScoreReporting";
import { useTeamPlayers } from "./useTeamPlayers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Users } from "lucide-react";

interface Match {
  id: string;
  match_number: number;
  round_number: number;
  team1_id: string | null;
  team2_id: string | null;
  score_team1: number | null;
  score_team2: number | null;
  status: string;
  winner_id: string | null;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  tournament_id?: string;
  team1?: { 
    id: string;
    name: string; 
  } | null;
  team2?: { 
    id: string;
    name: string; 
  } | null;
  tournament?: {
    id: string;
    name: string;
  } | null;
}

interface MatchTabsProps {
  match: Match;
  userTeamId: string | null;
  isAdmin: boolean;
  onScoreSubmitted: () => void;
  // Removed: onTeamsRebalanced: () => void;
}

const MatchTabs = ({
  match,
  userTeamId,
  isAdmin,
  onScoreSubmitted,
  // Removed: onTeamsRebalanced
}: MatchTabsProps) => {
  // Fetch team players using the new hook
  const { players: team1Players, loading: loadingTeam1 } = useTeamPlayers(match.team1_id);
  const { players: team2Players, loading: loadingTeam2 } = useTeamPlayers(match.team2_id);

  // Only show the Overview tab; admin tab was only used for team balancing.
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="bg-slate-800 border-slate-700">
        <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
          Overview
        </TabsTrigger>
        {/* Removed admin tab for team balancing */}
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <MatchScoreCards
          team1Name={match.team1?.name || 'TBD'}
          team2Name={match.team2?.name || 'TBD'}
          team1Score={match.score_team1}
          team2Score={match.score_team2}
        />

        {/* Map Veto Manager */}
        {match.team1_id && match.team2_id && (
          <MapVetoManager
            matchId={match.id}
            team1Id={match.team1_id}
            team2Id={match.team2_id}
            team1Name={match.team1?.name || 'Team 1'}
            team2Name={match.team2?.name || 'Team 2'}
            matchStatus={match.status}
            userTeamId={userTeamId}
            isAdmin={isAdmin}
          />
        )}

        <MatchInformation
          scheduledTime={match.scheduled_time}
          status={match.status}
          startedAt={match.started_at}
          completedAt={match.completed_at}
          winnerId={match.winner_id}
          team1Id={match.team1_id}
          team2Id={match.team2_id}
          team1Name={match.team1?.name || 'Team 1'}
          team2Name={match.team2?.name || 'Team 2'}
        />

        {/* Score Reporting */}
        {match.status !== 'completed' && (userTeamId || isAdmin) && (
          <ScoreReporting
            match={match}
            onScoreSubmitted={onScoreSubmitted}
          />
        )}

        {/* Teams & Players Panel */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teams &amp; Players
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-6">
            {/* Team 1 */}
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-bold text-lg text-white">{match.team1?.name || "Team 1"}</span>
                {match.team1_id === match.winner_id && (
                  <Badge className="bg-green-600 text-white ml-2">Winner</Badge>
                )}
              </div>
              <div className="space-y-2">
                {loadingTeam1 ? (
                  <div className="text-slate-400">Loading...</div>
                ) : team1Players.length === 0 ? (
                  <div className="text-slate-400">No players</div>
                ) : (
                  team1Players.map(player => (
                    <div key={player.user_id} className="flex items-center gap-3 py-1 px-2 rounded hover:bg-slate-700 transition">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="font-medium text-white">{player.discord_username}</span>
                      {player.is_captain && (
                        <Badge className="bg-yellow-500 text-black ml-2">Captain</Badge>
                      )}
                      <span className="ml-auto text-xs text-slate-300">
                        Rank: <span className="font-semibold">{player.current_rank || "Unranked"}</span>
                      </span>
                      <span className="text-xs text-purple-300 ml-3">
                        Weight: <span className="font-semibold">{player.weight_rating ?? "—"}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Team 2 */}
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-bold text-lg text-white">{match.team2?.name || "Team 2"}</span>
                {match.team2_id === match.winner_id && (
                  <Badge className="bg-green-600 text-white ml-2">Winner</Badge>
                )}
              </div>
              <div className="space-y-2">
                {loadingTeam2 ? (
                  <div className="text-slate-400">Loading...</div>
                ) : team2Players.length === 0 ? (
                  <div className="text-slate-400">No players</div>
                ) : (
                  team2Players.map(player => (
                    <div key={player.user_id} className="flex items-center gap-3 py-1 px-2 rounded hover:bg-slate-700 transition">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="font-medium text-white">{player.discord_username}</span>
                      {player.is_captain && (
                        <Badge className="bg-yellow-500 text-black ml-2">Captain</Badge>
                      )}
                      <span className="ml-auto text-xs text-slate-300">
                        Rank: <span className="font-semibold">{player.current_rank || "Unranked"}</span>
                      </span>
                      <span className="text-xs text-purple-300 ml-3">
                        Weight: <span className="font-semibold">{player.weight_rating ?? "—"}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* End Teams & Players Panel */}
      </TabsContent>
      {/* Admin tab removed */}
    </Tabs>
  );
};

export default MatchTabs;
