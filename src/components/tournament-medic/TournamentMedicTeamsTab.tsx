import {
  CheckCircle,
  Copy,
  ChevronsUpDown,
  Import,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import TeamBalancingInterface from "@/components/TeamBalancingInterface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tournament } from "@/types/tournament";
// Table UI imports
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

// Helper type for convenience
type TeamWithMembers = {
  id: string;
  name: string;
  total_rank_points: number;
  captain_id: string | null;
  members: {
    user_id: string;
    is_captain: boolean;
    users: {
      discord_username: string | null;
      discord_id: string | null;
      current_rank: string | null;
      weight_rating: number | null;
    } | null;
  }[];
};

function TeamListAnnouncePreview({ teams }: { teams: TeamWithMembers[] }) {
  // Up to 3 columns display, like your mockup (one row per group of 3 teams)
  if (!teams.length) return null;
  const rows = [];
  for (let i = 0; i < teams.length; i += 3) {
    rows.push(teams.slice(i, i + 3));
  }
  return (
    <div className="my-6">
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div
            className="flex flex-col md:flex-row md:gap-5 md:justify-center"
            key={i}
          >
            {row.map((team, j) => (
              <Card
                key={team.id || j}
                className="flex-1 mb-3 md:mb-0 bg-slate-900 border-slate-700 min-w-[220px] max-w-xs mr-4 p-3"
              >
                <div className="font-bold text-lg text-yellow-300 flex-shrink-0 leading-tight">
                  {team.name}{" "}
                  <span className="text-xs text-yellow-400 font-normal">
                    ({team.total_rank_points ?? "?"})
                  </span>
                </div>
                <ul className="mt-1 text-xs font-mono text-slate-200 space-y-1">
                  {team.members.map((member, k) => (
                    <li className="flex justify-between gap-2" key={member.user_id || k}>
                      <span>
                        {member.users?.discord_username ?? "?"}
                        {member.is_captain && (
                          <span className="text-[0.85em] text-green-300 mx-1">(c)</span>
                        )}
                      </span>
                      <span className="text-slate-400">
                        {member.users?.current_rank || "—"}{" "}
                        ·{" "}
                        {typeof member.users?.weight_rating === "number"
                          ? member.users.weight_rating
                          : "?"}
                        {member.users?.discord_id && (
                          <span className="ml-1 text-slate-500">{member.users.discord_id}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentMedicTeamsTab({
  tournament,
  onRefresh,
}: {
  tournament: Tournament,
  onRefresh: () => void
}) {
  const [activeSection, setActiveSection] =
    useState<'team_builder' | 'quick_actions'>('team_builder');

  // --- NEW: Discord Webhook and team data state ---
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [announceLoading, setAnnounceLoading] = useState(false);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);

  // Fetch teams for announcement
  const fetchTeams = async () => {
    setFetchLoading(true);
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          id, name, total_rank_points, captain_id, 
          members:team_members (
            user_id, is_captain,
            users (
              discord_username,
              discord_id,
              current_rank,
              weight_rating
            )
          )
        `)
        .eq("tournament_id", tournament.id)
        .order("name", { ascending: true });
      if (error) throw error;
      setTeams((data ?? []) as TeamWithMembers[]);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to fetch teams",
        variant: "destructive",
      });
      setTeams([]);
    }
    setFetchLoading(false);
  };

  useEffect(() => {
    fetchTeams();
    // eslint-disable-next-line
  }, [tournament.id]);

  // Helper to construct the Discord message (plaintext, code, and embed)
  function generateDiscordMessage(teams: TeamWithMembers[]) {
    // Sort by name and group in 3 columns (side-by-side)
    if (!teams.length) return { content: "No teams found.", embed: {} };
    let outRows: string[] = [];
    let rowArr: string[][] = [];
    for (let i = 0; i < teams.length; i += 3) {
      // Three teams per row (column layout)
      const rowTeams = teams.slice(i, i + 3);
      // For each team, compute lines: Team Name (weight)\n captain (c) - rank, etc.
      const longest = Math.max(...rowTeams.map(t => t.members.length));
      let teamBlocks: string[][] = rowTeams.map(team => {
        let block: string[] = [];
        // Header
        block.push(
          `${team.name} (${team.total_rank_points ?? "?"})`
        );
        // Members: captain first
        team.members
          .filter(mem => mem.is_captain)
          .forEach(mem =>
            block.push(
              `${mem.users?.discord_username ?? "?"} (c) - ${mem.users?.current_rank ?? "—"} (${mem.users?.weight_rating ?? "?"}) [${mem.users?.discord_id ?? "N/A"}]`
            )
          );
        // Members: others
        team.members
          .filter(mem => !mem.is_captain)
          .forEach(mem =>
            block.push(
              `${mem.users?.discord_username ?? "?"} - ${mem.users?.current_rank ?? "—"} (${mem.users?.weight_rating ?? "?"}) [${mem.users?.discord_id ?? "N/A"}]`
            )
          );
        // Pad to equal length
        while (block.length < longest + 1) block.push("");
        return block;
      });
      // Now line up each "row" of the columns
      for (let l = 0; l < teamBlocks[0].length; ++l) {
        rowArr.push(
          teamBlocks.map(col => col[l].padEnd(28, " ")), // nice spacing
        );
      }
      // Add an empty row after the set
      rowArr.push(["", "", ""]);
    }
    // Construct the multiline block
    outRows = rowArr.map(cols => cols.join(" | "));
    const content = "```\n" + outRows.join("\n") + "\n```";
    return {
      content,
      embed: {
        title: `Teams for ${tournament.name}`,
        description: "Tournament teams have been generated.\nSee team breakdowns below.",
        color: 0x00bfff,
        timestamp: new Date().toISOString(),
        footer: {
          text: "Tournament Team Announcer",
        }
      },
    };
  }

  // Send via Discord Webhook
  const handleAnnounceTeams = async () => {
    if (!discordWebhook.trim()) {
      toast({
        title: "Discord Webhook Missing",
        description: "Please provide a Discord webhook URL.",
        variant: "destructive",
      });
      return;
    }
    if (!teams.length) {
      toast({
        title: "Teams Not Ready",
        description: "No teams found. Generate or refresh before announcing.",
        variant: "destructive",
      });
      return;
    }
    setAnnounceLoading(true);
    try {
      const message = generateDiscordMessage(teams);
      // send webhook payload
      const payload = {
        username: "Tournament Bot",
        embeds: [message.embed],
        content: message.content,
      };
      const resp = await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`Discord Error: ${resp.status} ${resp.statusText}`);
      toast({
        title: "Announced!",
        description: "Teams were posted to Discord.",
      });
    } catch (err: any) {
      toast({
        title: "Announcement Failed",
        description: err.message || "Failed to announce teams to Discord.",
        variant: "destructive",
      });
    }
    setAnnounceLoading(false);
  };

  return (
    <div>
      {/* Discord Webhook controls */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Discord webhook URL…"
            value={discordWebhook}
            onChange={e => setDiscordWebhook(e.target.value)}
            className="w-[360px] bg-slate-700 border-slate-600 text-white"
            autoComplete="off"
          />
          <Button
            onClick={handleAnnounceTeams}
            disabled={announceLoading || fetchLoading}
            className="bg-blue-700 hover:bg-blue-800"
          >
            {announceLoading ? "Announcing..." : "Announce Teams"}
          </Button>
          <Button
            onClick={fetchTeams}
            disabled={fetchLoading}
            variant="outline"
            className="border-yellow-500 ml-2"
          >
            {fetchLoading ? "Refreshing…" : "Refresh Teams"}
          </Button>
        </div>
        <small className="text-slate-400">
          Enter your Discord webhook then click "Announce Teams". Teams will appear below. <br />
          If no teams are visible, use "Refresh Teams" or generate them first.
        </small>
      </div>

      {/* Preview of team list in nice columns */}
      <TeamListAnnouncePreview teams={teams} />

      {/* Team builder and quick actions */}
      <div>
        <div className="flex gap-2 mb-4">
          <button
            className={`px-3 py-1 rounded ${
              activeSection === 'team_builder'
                ? 'bg-yellow-700 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
            onClick={() => setActiveSection('team_builder')}
          >
            Team Builder
          </button>
          <button
            className={`px-3 py-1 rounded ${
              activeSection === 'quick_actions'
                ? 'bg-yellow-700 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
            onClick={() => setActiveSection('quick_actions')}
          >
            Quick Actions
          </button>
        </div>
        {activeSection === 'team_builder' && (
          <TeamBalancingInterface
            tournamentId={tournament.id}
            maxTeams={tournament.max_teams}
            teamSize={tournament.team_size}
            onTeamsUpdated={() => {
              onRefresh();
              fetchTeams();
            }}
          />
        )}
        {activeSection === 'quick_actions' && (
          <div>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Team List
                </Button>
                <Button variant="outline" className="w-full">
                  <Import className="w-4 h-4 mr-2" />
                  Import Teams from CSV
                </Button>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Team Actions</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Captain</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Team 1</TableCell>
                      <TableCell>Player 1</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Team 2</TableCell>
                      <TableCell>Player 2</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
