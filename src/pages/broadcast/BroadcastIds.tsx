import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BroadcastSettingsPanel from "@/components/broadcast/BroadcastSettingsPanel";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  status: string;
}

interface BroadcastTeam {
  id: string;
  name: string;
  seed: number;
  total_rank_points: number;
  team_members: {
    user_id: string;
    is_captain: boolean;
    users: {
      id: string;
      discord_username: string;
      riot_id: string;
    };
  }[];
}

interface BroadcastMatch {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string;
  team2_id: string;
  status: string;
}

export default function BroadcastIds() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<BroadcastTeam[]>([]);
  const [matches, setMatches] = useState<BroadcastMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `ID: ${text}`,
    });
  };

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .eq("id", id)
        .single();

      const { data: teamsData } = await supabase
        .from("teams")
        .select(`
          id, name, seed, total_rank_points,
          team_members (
            user_id,
            is_captain,
            users (
              id,
              discord_username,
              riot_id
            )
          )
        `)
        .eq("tournament_id", id)
        .order("seed", { ascending: true });

      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, round_number, match_number, team1_id, team2_id, status")
        .eq("tournament_id", id)
        .order("round_number")
        .order("match_number");

      setTournament(tournamentData || null);
      setTeams(teamsData || []);
      setMatches(matchesData || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">Tournament not found</div>
      </div>
    );
  }

  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
        <h2 className="text-2xl text-muted-foreground">
          Broadcast System - IDs Reference & Settings
        </h2>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            Tournament ID:{" "}
            <code className="bg-background p-1 rounded">{tournament.id}</code>
          </p>
        </div>
      </div>

      {/* Split Layout 50/50 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* LEFT SIDE - IDs, Teams, Matches, Docs */}
        <div className="space-y-8">
          {/* API Endpoints */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">📡 Broadcast URLs</h3>
            <div className="space-y-3 text-sm font-mono">
              <div>
                <span className="font-bold">Team Roster:</span>
                <div className="bg-muted p-2 rounded mt-1">
                  {baseUrl}/broadcast/{id}/team/[TEAM_ID]
                </div>
              </div>
              <div>
                <span className="font-bold">Match Preview (by Match ID):</span>
                <div className="bg-muted p-2 rounded mt-1">
                  {baseUrl}/broadcast/{id}/matchup/[MATCH_ID]
                </div>
              </div>
              <div>
                <span className="font-bold">
                  Match Preview (by Team IDs - Legacy):
                </span>
                <div className="bg-muted p-2 rounded mt-1">
                  {baseUrl}/broadcast/{id}/matchup/[TEAM_ID]/[TEAM_ID]
                </div>
              </div>
              <div>
                <span className="font-bold">Player Spotlight:</span>
                <div className="bg-muted p-2 rounded mt-1">
                  {baseUrl}/broadcast/{id}/player/[USER_ID]
                </div>
              </div>
              <div>
                <span className="font-bold">Tournament Stats:</span>
                <div className="bg-muted p-2 rounded mt-1">
                  {baseUrl}/broadcast/{id}/stats
                </div>
              </div>
              <div>
                <span className="font-bold">Bracket Overlay:</span>
                <div className="bg-muted p-2 rounded mt-1">
                  {baseUrl}/broadcast/{id}/bracket
                </div>
              </div>
            </div>
          </div>

          {/* Teams */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">
              🏆 Teams ({teams.length})
            </h3>
            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {teams.map((team) => (
                <div key={team.id} className="bg-muted rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{team.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Seed #{team.seed} • Weight: {team.total_rank_points}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code
                        className="bg-background p-1 rounded text-xs cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => copyToClipboard(team.id)}
                      >
                        {team.id}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          window.open(
                            `${baseUrl}/broadcast/${id}/team/${team.id}`,
                            "_blank"
                          )
                        }
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Players:</h5>
                    {team.team_members.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex justify-between items-center text-sm bg-background p-2 rounded"
                      >
                        <div>
                          <span className="font-medium">
                            {member.users.discord_username}
                          </span>
                          {member.is_captain && (
                            <span className="ml-2 text-yellow-600">
                              (Captain)
                            </span>
                          )}
                          {member.users.riot_id && (
                            <span className="ml-2 text-muted-foreground">
                              • {member.users.riot_id}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <code
                            className="text-xs cursor-pointer hover:bg-muted transition-colors p-1 rounded"
                            onClick={() => copyToClipboard(member.user_id)}
                          >
                            {member.user_id}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() =>
                              window.open(
                                `${baseUrl}/broadcast/${id}/player/${member.user_id}`,
                                "_blank"
                              )
                            }
                          >
                            <ExternalLink className="h-2 w-2" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matches */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">
              ⚔️ Matches ({matches.length})
            </h3>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {matches.map((match) => {
                const team1 = teams.find((t) => t.id === match.team1_id);
                const team2 = teams.find((t) => t.id === match.team2_id);

                return (
                  <div
                    key={match.id}
                    className="bg-muted rounded-lg p-3 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        Round {match.round_number}, Match {match.match_number}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {team1?.name || "TBD"} vs {team2?.name || "TBD"}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        Status: {match.status}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code
                        className="text-xs bg-background p-1 rounded cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => copyToClipboard(match.id)}
                      >
                        {match.id}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          window.open(
                            `${baseUrl}/broadcast/${id}/matchup/${match.id}`,
                            "_blank"
                          )
                        }
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* API Documentation */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">📖 Usage Instructions</h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">For OBS Studio:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Add a Browser Source</li>
                  <li>Copy the URL you want to use from above</li>
                  <li>
                    Replace [TEAM_ID], [MATCH_ID], or [USER_ID] with actual IDs
                    from this page
                  </li>
                  <li>Set width/height as needed (pages are responsive)</li>
                  <li>All pages have transparent backgrounds</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium mb-2">Animation Controls:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    Add <code>?animate=false</code> to disable intro animations
                  </li>
                  <li>
                    Team rosters have a 4-second intro sequence by default
                  </li>
                  <li>All other pages are static overlays</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Refresh Data:</h4>
                <p className="text-muted-foreground ml-4">
                  Browser sources automatically refresh data. For manual refresh,
                  press F5 in the browser source or reload the page.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Settings */}
        <div className="space-y-6">
          <BroadcastSettingsPanel />
        </div>
      </div>
    </div>
  );
}
