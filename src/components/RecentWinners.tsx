
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy, Users, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { StyledUsername } from "./StyledUsername";

type Winner = {
  tournament: string;
  tournamentId: string;
  team: string;
  memberList: { id: string; discord_username: string; current_rank: string }[];
};

export default function RecentWinners() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchWinners() {
      setLoading(true);
      // 1. Get completed tournaments (limit 2)
      const { data: tournaments } = await supabase
        .from("tournaments")
        .select("id,name")
        .eq("status", "completed")
        .order("start_time", { ascending: false })
        .limit(2);

      if (!tournaments || tournaments.length === 0) {
        setWinners([]);
        setLoading(false);
        return;
      }

      // 2. For each, get the winner team (teams.status = 'winner')
      const result: Winner[] = [];
      for (const t of tournaments) {
        const { data: team } = await supabase
          .from("teams")
          .select("id,name")
          .eq("tournament_id", t.id)
          .eq("status", "winner")
          .maybeSingle();

        if (!team) continue;

        // 3. Get its members
        const { data: members } = await supabase
          .from("team_members")
          .select("user_id,users!team_members_user_id_fkey(id,discord_username,current_rank)")
          .eq("team_id", team.id);

        const memberList = (members || []).map((m: any) => ({
          id: m.users?.id ?? "",
          discord_username: m.users?.discord_username ?? "Unknown",
          current_rank: m.users?.current_rank ?? "Unranked"
        }));

        result.push({
          tournament: t.name,
          tournamentId: t.id,
          team: team.name,
          memberList
        });
      }
      setWinners(result);
      setLoading(false);
    }
    fetchWinners();
  }, []);

  if (loading) return (
    <Card className="bg-slate-800 border-slate-700 mb-4">
      <CardHeader>
        <CardTitle className="text-white">Most Recent Champions</CardTitle>
      </CardHeader>
      <CardContent>Loading...</CardContent>
    </Card>
  );

  if (!winners.length) return (
    <Card className="bg-slate-800 border-slate-700 mb-4">
      <CardHeader>
        <CardTitle className="text-white">Most Recent Champions</CardTitle>
      </CardHeader>
      <CardContent>No results</CardContent>
    </Card>
  );

  // Only show most recent (first)
  const winner = winners[0];

  // Make the card clickable and accessible
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Go to ${winner.tournament} tournament`}
      onClick={() => navigate(`/tournament/${winner.tournamentId}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/tournament/${winner.tournamentId}`);
      }}
      className="outline-none focus:ring-2 ring-yellow-500 rounded-xl transition-shadow cursor-pointer"
      style={{}}
    >
      <Card className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 border-yellow-600/30 mb-4 hover:shadow-lg hover:scale-[1.015] transition duration-150">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <CardTitle className="text-lg font-bold text-yellow-500">
              {winner.tournament} Champions
            </CardTitle>
            <Crown className="w-6 h-6 text-yellow-500" />
          </div>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-base px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            {winner.team}
          </Badge>
        </CardHeader>
        <CardContent>
          <div>
            <div className="flex items-center justify-center gap-2 text-slate-300 mb-2">
              <Users className="w-4 h-4" />
              <span className="font-medium">Team Members</span>
            </div>
            <ul className="grid grid-cols-1 gap-2">
              {winner.memberList.map(member => (
                <li 
                  key={member.id}
                  className="bg-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between"
                >
                  <span className="text-white">
                    <StyledUsername username={member.discord_username} userId={member.id} />
                  </span>
                  <Badge variant="outline" className="text-slate-300 border-slate-500">
                    {member.current_rank}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ... nothing below
