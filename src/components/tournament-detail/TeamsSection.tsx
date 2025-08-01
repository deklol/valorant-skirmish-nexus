
import { Crown, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import ClickableUsername from "@/components/ClickableUsername";
import TournamentBalanceTransparency from "./TournamentBalanceTransparency";
import TournamentSignupsDisplay from "./TournamentSignupsDisplay";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/tournamentDetail";
import type { Database } from "@/integrations/supabase/types";

interface TeamsSectionProps {
  teams: Team[];
  tournament?: Database["public"]["Tables"]["tournaments"]["Row"] | null;
}

export default function TeamsSection({ teams, tournament }: TeamsSectionProps) {
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorted alphabetically
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (tournament?.id && sortedTeams.length === 0) {
      fetchSignups();
    } else {
      setLoading(false);
    }
  }, [tournament?.id, sortedTeams.length]);

  const fetchSignups = async () => {
    if (!tournament?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select(`
          *,
          users (
            id,
            discord_username,
            current_rank,
            rank_points,
            weight_rating,
            discord_avatar_url,
            riot_id
          )
        `)
        .eq('tournament_id', tournament.id)
        .order('priority', { ascending: false })
        .order('signed_up_at', { ascending: true });

      if (error) throw error;
      setSignups(data || []);
    } catch (error) {
      console.error('Error fetching signups:', error);
      setSignups([]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Tournament Info Card */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-4">Tournament Info</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Format:</span>
            <span className="text-white">{tournament?.bracket_type?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Team Size:</span>
            <span className="text-white">{tournament?.team_size}v{tournament?.team_size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Teams:</span>
            <span className="text-white">{tournament?.max_teams}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Players:</span>
            <span className="text-white">{tournament?.max_players}</span>
          </div>
        </div>
      </div>

      {/* Teams Section */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl">
        <div className="p-4">
          <div className="text-lg font-bold text-white flex gap-2 items-center mb-4">
            <Users className="w-4 h-4" />
            Teams &amp; Participants
          </div>
          {sortedTeams.length === 0 ? (
            loading ? (
              <div className="text-slate-400">Loading participants...</div>
            ) : (
              <TournamentSignupsDisplay 
                signups={signups} 
                maxPlayers={tournament?.max_players || 0} 
              />
            )
          ) : (
            <div className="space-y-4">
              {sortedTeams.map((team) => (
                <div
                  key={team.id}
                  className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow flex flex-col"
                >
                  {/* --- Team heading row --- */}
                  <div className="flex flex-row items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-white">{team.name}</span>
                      {team.team_members?.some(m => m.is_captain) && (
                        <span title="Captain">
                          <Crown className="w-5 h-5 text-yellow-400" />
                        </span>
                      )}
                    </div>
                    <Badge className="bg-purple-700/30 border border-purple-500 text-purple-200 font-semibold text-xs px-4 py-1 rounded-full">
                      Team Weight: {team.total_rank_points ?? 0}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {team.team_members && team.team_members.length > 0 ? (
                      team.team_members.map(member => (
                        <div
                          key={member.user_id}
                          className={`flex items-center gap-2 px-3 py-2 rounded ${
                            member.is_captain
                              ? "bg-slate-800 text-white font-semibold"
                              : "bg-slate-800/80 text-blue-200"
                          }`}
                        >
                          <Users className="w-4 h-4 text-blue-300" />
                          <ClickableUsername
                            userId={member.user_id}
                            username={member.users?.discord_username || ""}
                            className={`${
                              member.is_captain ? "text-white" : "text-blue-300"
                            }`}
                          />
                          {member.is_captain && (
                            <span title="Captain">
                              <Crown className="w-4 h-4 text-yellow-400 ml-1" />
                            </span>
                          )}
                          <span className="ml-auto text-xs text-slate-400">
                            {member.users?.current_rank || "Unranked"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">No participants</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Balance Analysis Section */}
      {tournament?.balance_analysis && (
        <div className="mt-6">
          <TournamentBalanceTransparency 
            balanceAnalysis={tournament.balance_analysis as any}
            teams={teams}
          />
        </div>
      )}
    </div>
  );
}
