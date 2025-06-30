import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Shuffle, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTeamBalancingLogic } from "./team-balancing/TeamBalancingLogic";
import EnhancedRankFallbackAlert from "./team-balancing/EnhancedRankFallbackAlert";
import { calculateTeamBalance } from "@/utils/rankingSystem";

interface TeamBalancingInterfaceProps {
  tournamentId: string;
  maxTeams: number;
  teamSize: number;
  onTeamsUpdated: () => void;
}

const TeamBalancingInterface = ({ tournamentId, maxTeams, teamSize, onTeamsUpdated }: TeamBalancingInterfaceProps) => {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [balanceStatus, setBalanceStatus] = useState<any>(null);
  const { toast } = useToast();
  const { balanceTeams } = useTeamBalancingLogic({
    tournamentId,
    maxTeams,
    onTeamsBalanced: () => {
      fetchTeamsAndPlayers();
      onTeamsUpdated();
    }
  });

  useEffect(() => {
    fetchTeamsAndPlayers();
  }, [tournamentId]);

  const fetchTeamsAndPlayers = async () => {
    try {
      // Fetch checked-in players with enhanced rank data
      const { data: signupsData } = await supabase
        .from('tournament_signups')
        .select(`
          user_id,
          users:user_id (
            id,
            discord_username,
            current_rank,
            peak_rank,
            weight_rating,
            manual_rank_override,
            manual_weight_override,
            use_manual_override,
            rank_override_reason
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('is_checked_in', true);

      const playersData = signupsData?.map(signup => ({
        id: signup.users?.id,
        discord_username: signup.users?.discord_username,
        current_rank: signup.users?.current_rank,
        peak_rank: signup.users?.peak_rank,
        weight_rating: signup.users?.weight_rating,
        manual_rank_override: signup.users?.manual_rank_override,
        manual_weight_override: signup.users?.manual_weight_override,
        use_manual_override: signup.users?.use_manual_override,
        rank_override_reason: signup.users?.rank_override_reason
      })).filter(player => player.id) || [];

      setPlayers(playersData);

      // Fetch existing teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          total_rank_points,
          seed,
          team_members (
            user_id,
            is_captain,
            users (
              discord_username,
              current_rank,
              peak_rank,
              weight_rating,
              manual_rank_override,
              manual_weight_override,
              use_manual_override
            )
          )
        `)
        .eq('tournament_id', tournamentId)
        .order('seed', { ascending: true });

      setTeams(teamsData || []);

      // Calculate balance status if teams exist
      if (teamsData && teamsData.length >= 2) {
        const team1Points = teamsData[0]?.total_rank_points || 0;
        const team2Points = teamsData[1]?.total_rank_points || 0;
        const balance = calculateTeamBalance(team1Points, team2Points);
        setBalanceStatus(balance);
      } else {
        setBalanceStatus(null);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load tournament data",
        variant: "destructive",
      });
    }
  };

  const handleBalanceTeams = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await balanceTeams();
      toast({
        title: "Teams Balanced",
        description: "Teams have been automatically balanced based on player rankings",
      });
    } catch (error: any) {
      console.error('Error balancing teams:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to balance teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Rank Fallback Alert */}
      <EnhancedRankFallbackAlert players={players} />

      {/* Team Balancing Controls */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Team Balancing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-300">
              <p><strong>Checked-in Players:</strong> {players.length}</p>
              <p><strong>Format:</strong> {teamSize}v{teamSize}</p>
              <p><strong>Max Teams:</strong> {maxTeams}</p>
            </div>
            <Button 
              onClick={handleBalanceTeams}
              disabled={loading || players.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              {loading ? 'Balancing...' : 'Balance Teams'}
            </Button>
          </div>

          {balanceStatus && (
            <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                {balanceStatus.balanceStatus === 'ideal' || balanceStatus.balanceStatus === 'good' 
                  ? <CheckCircle className="w-4 h-4 text-green-400" />
                  : <AlertTriangle className="w-4 h-4 text-yellow-400" />
                }
                <span className={`font-medium ${balanceStatus.statusColor}`}>
                  Team Balance Status
                </span>
              </div>
              <p className="text-sm text-slate-300 mb-2">{balanceStatus.statusMessage}</p>
              <div className="text-xs text-slate-400">
                Team 1: {balanceStatus.team1Points} points • Team 2: {balanceStatus.team2Points} points • 
                Difference: {balanceStatus.delta} points
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teams Display */}
      {teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">{team.name}</CardTitle>
                <div className="text-sm text-slate-400">
                  Total Points: {team.total_rank_points} • Seed: {team.seed}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {team.team_members?.map((member: any) => (
                    <div key={member.user_id} className="flex items-center justify-between p-2 rounded bg-slate-700/50">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {member.users?.discord_username || 'Unknown'}
                        </span>
                        {member.is_captain && (
                          <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                            Captain
                          </span>
                        )}
                        {member.users?.use_manual_override && (
                          <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                            Override
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {member.users?.current_rank || 'Unranked'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamBalancingInterface;
