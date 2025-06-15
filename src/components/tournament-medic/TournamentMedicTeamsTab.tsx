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

// Redesigned team preview: more pleasing, card grid, no discord ids, compact
function TeamListAnnouncePreview({ teams }: { teams: TeamWithMembers[] }) {
  if (!teams.length) return null;

  // Make grid: 3 columns max, gap for cards
  return (
    <div className="my-6 w-full">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {teams.map((team) => (
          <Card
            key={team.id}
            className="bg-slate-900 border-slate-700 min-w-[220px] flex flex-col p-4 shadow relative"
          >
            <div className="font-bold text-base text-yellow-300">
              {team.name}
              {" "}
              <span className="ml-1 text-xs text-yellow-300 font-normal opacity-80">
                ({team.total_rank_points ?? "?"})
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {team.members.map((member, idx) => (
                <li className="flex items-center justify-between text-xs" key={member.user_id || idx}>
                  <span className="text-sky-200 font-mono font-medium flex items-center">
                    {member.users?.discord_username ?? "?"}
                    {member.is_captain && (
                      <span className="text-green-300 text-[0.92em] font-normal ml-1">(c)</span>
                    )}
                  </span>
                  <span className="text-slate-400 ml-2">
                    {member.users?.current_rank || "—"}
                    {typeof member.users?.weight_rating === "number" && (
                      <span className="ml-1 text-slate-500">[{member.users?.weight_rating}]</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
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

  // Discord Webhook and teams state
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

  // Helper to construct the Discord message with embed fields per team, improved with tournament info & link
  function generateDiscordMessage(teams: TeamWithMembers[]) {
    if (!teams.length) return { content: "No teams found.", embed: {} };

    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

    // Helper: format members
    function formatMembers(members: TeamWithMembers["members"]) {
      // Show captain first, then others; no emojis, no bullets, captain marked with (c)
      const lines: string[] = [];

      // Captain first, if any
      const captainMember = members.find((m) => m.is_captain);
      if (captainMember) {
        const uname = captainMember.users?.discord_username ?? "?";
        const rank = captainMember.users?.current_rank ?? "—";
        const weight =
          typeof captainMember.users?.weight_rating === "number"
            ? ` [${captainMember.users.weight_rating}]`
            : "";
        lines.push(`${uname} (c) — ${rank}${weight}`);
      }

      // All other members
      members
        .filter((m) => !m.is_captain)
        .forEach((m) => {
          const uname = m.users?.discord_username ?? "?";
          const rank = m.users?.current_rank ?? "—";
          const weight =
            typeof m.users?.weight_rating === "number"
              ? ` [${m.users?.weight_rating}]`
              : "";
          lines.push(`${uname} — ${rank}${weight}`);
        });

      return lines.length ? lines.join("\n") : "*No members*";
    }

    // Construct key info
    const tournamentUrl = `${window.location.origin}/tournaments/${tournament.id}`;
    const embedTitle = `[${tournament.name}](${tournamentUrl})`;
    const embedDescLines = [];
    if (tournament.description) embedDescLines.push(`*${tournament.description}*`);
    if (tournament.start_time) {
      const localDate = new Date(tournament.start_time).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short"});
      embedDescLines.push(`**Start:** ${localDate}`);
    }
    embedDescLines.push(`**Status:** ${tournament.status}`);
    embedDescLines.push(`**Format:** ${tournament.match_format || "?"} / ${tournament.bracket_type || "?"}`);
    if (tournament.prize_pool) embedDescLines.push(`**Prize:** ${tournament.prize_pool}`);
    embedDescLines.push(`**Team Size:** ${tournament.team_size}, Max Teams: ${tournament.max_teams}`);

    // Compose embed fields: one field per team
    const fields = sortedTeams.map((team) => ({
      name: `🏆 ${team.name} (${team.total_rank_points ?? "0"})`,
      value: formatMembers(team.members),
      inline: true,
    }));

    return {
      content: `**Teams for [${tournament.name}](${tournamentUrl})**`,
      embed: {
        title: tournament.name,
        url: tournamentUrl,
        description: embedDescLines.join("\n"),
        color: 0x00bfff,
        timestamp: new Date().toISOString(),
        footer: {
          text: "TLRHub - Skirmish Manager",
        },
        fields,
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
            {/* Discord webhook controls + team preview */}
            <div className="mb-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="text"
                  placeholder="Discord webhook URL…"
                  value={discordWebhook}
                  onChange={e => setDiscordWebhook(e.target.value)}
                  className="w-[320px] bg-slate-700 border-slate-600 text-white"
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
                Enter your Discord webhook then click "Announce Teams". Teams will appear below.{" "}
                If no teams are visible, use "Refresh Teams" or generate them first.
              </small>
              {/* Team preview grid (nicer, horizontal gap, no Discord IDs) */}
              <TeamListAnnouncePreview teams={teams} />
            </div>

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

// NOTE: This file is now quite long. Consider asking me to refactor it into smaller files/components for better maintainability.
