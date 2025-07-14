
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, User, Map } from "lucide-react";
import MatchScoreCards from "./MatchScoreCards";
import MatchInformation from "./MatchInformation";
import MapVetoResults from "@/components/MapVetoResults";
import ScoreReporting from "@/components/ScoreReporting";
import VetoMedicManager from "@/components/VetoMedicManager";
import { useTeamPlayers } from "./useTeamPlayers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ClickableUsername from "@/components/ClickableUsername";
import { VetoDialog } from "@/components/veto/VetoDialog";
import { useState } from "react";

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
}

const MatchTabs = ({
  match,
  userTeamId,
  isAdmin,
  onScoreSubmitted,
}: MatchTabsProps) => {
  const { players: team1Players, loading: loadingTeam1 } = useTeamPlayers(match.team1_id);
  const { players: team2Players, loading: loadingTeam2 } = useTeamPlayers(match.team2_id);
  const [vetoDialogOpen, setVetoDialogOpen] = useState(false);

  // Safe fallback: ensure always returning JSX or null
  if (!match) {
    return null;
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="bg-slate-800/90 border border-slate-700">
        <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
          Overview
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="admin" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <Settings className="w-4 h-4 mr-2" />
            Admin
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <MatchScoreCards
          team1Name={match.team1?.name || 'TBD'}
          team2Name={match.team2?.name || 'TBD'}
          team1Score={match.score_team1}
          team2Score={match.score_team2}
        />

        {/* Map Veto Section */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Map className="w-5 h-5" />
              Map Veto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show final veto results if veto is completed */}
            <MapVetoResults matchId={match.id} />
            
            {/* Veto button for participants */}
            {match.status !== 'completed' && (userTeamId || isAdmin) && (
              <Button
                onClick={() => setVetoDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Map className="w-4 h-4 mr-2" />
                Open Map Veto
              </Button>
            )}
          </CardContent>
        </Card>

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
          tournamentId={match.tournament_id}
        />

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
          <CardContent>
            <div className="flex flex-col md:flex-row gap-8">
              {/* TEAM 1 */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-xl text-white whitespace-nowrap">
                    {match.team1?.name || "Team 1"}
                  </span>
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
                      <div
                        key={player.user_id}
                        className="flex items-center gap-x-3 gap-y-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 shadow-sm mt-1"
                      >
                        <User className="w-4 h-4 text-blue-400 mr-1" />
                        <ClickableUsername
                          userId={player.user_id}
                          username={player.discord_username}
                          className="text-blue-400 font-medium"
                        />
                        {player.is_captain && (
                          <Badge className="bg-yellow-400/90 text-black ml-2 font-bold">Captain</Badge>
                        )}
                        <span className="text-xs text-slate-300 ml-6 whitespace-nowrap">
                          <span className="font-semibold">Rank:</span>{" "}
                          <span>{player.current_rank || "Unranked"}</span>
                        </span>
                        <span className="text-xs text-purple-300 ml-5 whitespace-nowrap">
                          <span className="font-semibold">Weight:</span>{" "}
                          <span>{player.weight_rating ?? "—"}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:flex mx-2">
                <div className="w-[2px] bg-slate-700 rounded-full h-full"></div>
              </div>

              {/* TEAM 2 */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-xl text-white whitespace-nowrap">
                    {match.team2?.name || "Team 2"}
                  </span>
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
                      <div
                        key={player.user_id}
                        className="flex items-center gap-x-3 gap-y-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 shadow-sm mt-1"
                      >
                        <User className="w-4 h-4 text-blue-400 mr-1" />
                        <ClickableUsername
                          userId={player.user_id}
                          username={player.discord_username}
                          className="text-blue-400 font-medium"
                        />
                        {player.is_captain && (
                          <Badge className="bg-yellow-400/90 text-black ml-2 font-bold">Captain</Badge>
                        )}
                        <span className="text-xs text-slate-300 ml-6 whitespace-nowrap">
                          <span className="font-semibold">Rank:</span>{" "}
                          <span>{player.current_rank || "Unranked"}</span>
                        </span>
                        <span className="text-xs text-purple-300 ml-5 whitespace-nowrap">
                          <span className="font-semibold">Weight:</span>{" "}
                          <span>{player.weight_rating ?? "—"}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* End Teams & Players Panel */}
      </TabsContent>

      {isAdmin && (
        <TabsContent value="admin" className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Match Administration</h3>
            <VetoMedicManager />
          </div>
        </TabsContent>
      )}

      {/* Veto Dialog */}
      <VetoDialog
        matchId={match.id}
        open={vetoDialogOpen}
        onOpenChange={setVetoDialogOpen}
        team1Name={match.team1?.name || 'Team 1'}
        team2Name={match.team2?.name || 'Team 2'}
      />
    </Tabs>
  );
};

export default MatchTabs;
