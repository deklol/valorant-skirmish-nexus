import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Clock, Target, TrendingUp, Award, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TournamentStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: { id: string; name: string } | null;
}

interface TournamentStats {
  totalSignups: number;
  checkedInPlayers: number;
  totalTeams: number;
  totalMatches: number;
  completedMatches: number;
  liveMatches: number;
  averageMatchDuration: string;
  topPerformers: Array<{ name: string; wins: number; team: string }>;
  bracketProgress: number;
  registrationDate: string;
  startDate: string;
  status: string;
}

export default function TournamentStatsModal({ 
  open, 
  onOpenChange, 
  tournament 
}: TournamentStatsModalProps) {
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && tournament) {
      fetchTournamentStats();
    }
  }, [open, tournament]);

  const fetchTournamentStats = async () => {
    if (!tournament) return;
    
    setLoading(true);
    try {
      // Get tournament details
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournament.id)
        .single();

      // Get signup stats
      const { count: totalSignups } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournament.id);

      const { count: checkedInPlayers } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournament.id)
        .eq('is_checked_in', true);

      // Get team stats
      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournament.id);

      // Get match stats
      const { count: totalMatches } = await supabase
        .from('matches')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournament.id);

      const { count: completedMatches } = await supabase
        .from('matches')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournament.id)
        .eq('status', 'completed');

      const { count: liveMatches } = await supabase
        .from('matches')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournament.id)
        .eq('status', 'live');

      // Get top performers (winning team members)
      const { data: topPerformersData } = await supabase
        .from('team_members')
        .select(`
          users!inner(discord_username),
          teams!inner(name),
          teams!inner(
            matches_as_team1:matches!team1_id(winner_id),
            matches_as_team2:matches!team2_id(winner_id)
          )
        `)
        .eq('teams.tournament_id', tournament.id)
        .limit(5);

      // Calculate bracket progress
      const bracketProgress = totalMatches ? Math.round((completedMatches || 0) / totalMatches * 100) : 0;

      setStats({
        totalSignups: totalSignups || 0,
        checkedInPlayers: checkedInPlayers || 0,
        totalTeams: totalTeams || 0,
        totalMatches: totalMatches || 0,
        completedMatches: completedMatches || 0,
        liveMatches: liveMatches || 0,
        averageMatchDuration: "45min", // Placeholder - would need match duration calculation
        topPerformers: [], // Simplified for now
        bracketProgress,
        registrationDate: tournamentData?.created_at ? new Date(tournamentData.created_at).toLocaleDateString() : 'N/A',
        startDate: tournamentData?.start_time ? new Date(tournamentData.start_time).toLocaleDateString() : 'N/A',
        status: tournamentData?.status || 'Unknown'
      });
    } catch (error) {
      console.error('Error fetching tournament stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!tournament) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Tournament Statistics: {tournament.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-400">Loading statistics...</div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.totalSignups}</div>
                  <div className="text-slate-400 text-sm">Total Signups</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.checkedInPlayers}</div>
                  <div className="text-slate-400 text-sm">Checked In</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.totalTeams}</div>
                  <div className="text-slate-400 text-sm">Teams</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.liveMatches}</div>
                  <div className="text-slate-400 text-sm">Live Matches</div>
                </CardContent>
              </Card>
            </div>

            {/* Tournament Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    Tournament Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                      {stats.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registration:</span>
                    <span className="text-white">{stats.registrationDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Start Date:</span>
                    <span className="text-white">{stats.startDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bracket Progress:</span>
                    <span className="text-white">{stats.bracketProgress}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Match Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Matches:</span>
                    <span className="text-white">{stats.totalMatches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Completed:</span>
                    <span className="text-white">{stats.completedMatches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Live:</span>
                    <span className="text-white">{stats.liveMatches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg. Duration:</span>
                    <span className="text-white">{stats.averageMatchDuration}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <a 
                    href={`/tournament/${tournament.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                  >
                    View Tournament Page
                  </a>
                  <a 
                    href={`/tournament/${tournament.id}?tab=bracket`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
                  >
                    View Bracket
                  </a>
                  <a 
                    href={`/tournament/${tournament.id}?tab=admin`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm transition-colors"
                  >
                    Admin Settings
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            No statistics available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}