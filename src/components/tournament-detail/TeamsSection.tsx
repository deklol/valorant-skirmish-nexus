
import { Crown, Users, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ClickableUsername from "@/components/ClickableUsername";
import TournamentBalanceTransparency from "./TournamentBalanceTransparency";
import TournamentSignupsDisplay from "./TournamentSignupsDisplay";
import { supabase } from "@/integrations/supabase/client";
import { getRankIcon, getRankColor, calculateAverageRank } from "@/utils/rankUtils";
import type { Team } from "@/types/tournamentDetail";
import type { Database } from "@/integrations/supabase/types";

interface TeamsSectionProps {
  teams: Team[];
  tournament?: Database["public"]["Tables"]["tournaments"]["Row"] | null;
}

export default function TeamsSection({ teams, tournament }: TeamsSectionProps) {
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorted by highest weight first
  const sortedTeams = [...teams].sort((a, b) => (b.total_rank_points || 0) - (a.total_rank_points || 0));

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

  const generateDiscordExport = () => {
    const tournamentName = tournament?.name || "Tournament";
    let exportText = `**${tournamentName} - Teams Export**\n\n`;
    
    sortedTeams.forEach((team, index) => {
      exportText += `**${index + 1}. ${team.name}** (Total Weight: ${team.total_rank_points ?? 0})\n`;
      
      if (team.team_members && team.team_members.length > 0) {
        team.team_members.forEach(member => {
          const rank = member.users?.current_rank || "Unranked";
          const weight = member.users?.weight_rating || member.users?.rank_points || 0;
          const captain = member.is_captain ? " 👑" : "";
          const rankEmoji = getRankIcon(rank);
          
          exportText += `  • ${member.users?.discord_username || "Unknown"}${captain} - ${rankEmoji} ${rank} (${weight})\n`;
        });
        
        const avgRank = calculateAverageRank(team.team_members.map(m => m.users?.current_rank));
        const avgWeight = Math.round((team.total_rank_points ?? 0) / team.team_members.length);
        exportText += `  📊 **Averages:** ${getRankIcon(avgRank)} ${avgRank} | Weight: ${avgWeight}\n\n`;
      } else {
        exportText += "  No players\n\n";
      }
    });
    
    return exportText;
  };
  return (
    <div className="bg-slate-800/90 border border-slate-700 rounded-xl">
      <div className="p-6">
        <div className="text-xl font-bold text-white flex gap-2 items-center justify-between mb-6">
          <div className="flex gap-2 items-center">
            <Users className="w-5 h-5" />
            Teams & Participants
          </div>
          {sortedTeams.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Teams
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Export Teams for Discord</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Copy the formatted text below and paste it directly into Discord:
                  </p>
                  <Textarea
                    value={generateDiscordExport()}
                    readOnly
                    className="min-h-[400px] font-mono text-sm"
                    onClick={(e) => e.currentTarget.select()}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedTeams.map((team) => (
              <div
                key={team.id}
                className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow"
              >
                {/* Team heading */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-lg text-white truncate">{team.name}</span>
                    {team.team_members?.some(m => m.is_captain) && (
                      <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
                
                {/* Team weight badge */}
                <div className="mb-3">
                  <Badge className="bg-purple-700/30 border border-purple-500 text-purple-200 font-semibold text-xs px-3 py-1 rounded-full">
                    Weight: {team.total_rank_points ?? 0}
                  </Badge>
                </div>
                
                {/* Team members */}
                <div className="space-y-2">
                  {team.team_members && team.team_members.length > 0 ? (
                    team.team_members.map(member => (
                      <div
                        key={member.user_id}
                        className={`flex items-center gap-2 px-2 py-1 rounded text-sm ${
                          member.is_captain
                            ? "bg-slate-800 text-white font-medium"
                            : "bg-slate-800/60 text-blue-200"
                        }`}
                      >
                        <ClickableUsername
                          userId={member.user_id}
                          username={member.users?.discord_username || ""}
                          className={`truncate ${
                            member.is_captain ? "text-white" : "text-blue-300"
                          }`}
                        />
                        {member.is_captain && (
                          <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                        )}
                        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                          <span className="text-sm">{getRankIcon(member.users?.current_rank)}</span>
                          <span className="text-xs" style={{ color: getRankColor(member.users?.current_rank) }}>
                            {member.users?.current_rank || "Unranked"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic text-sm">No participants</div>
                  )}
                </div>

                {/* Average stats */}
                {team.team_members && team.team_members.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
                    <div className="text-xs text-slate-400">
                      Average Rank: <span style={{ color: getRankColor(calculateAverageRank(team.team_members.map(m => m.users?.current_rank))) }}>
                        {calculateAverageRank(team.team_members.map(m => m.users?.current_rank))}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Average Weight: <span className="text-purple-300">
                        {Math.round((team.total_rank_points ?? 0) / team.team_members.length)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
