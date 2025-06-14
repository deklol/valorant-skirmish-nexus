
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Shuffle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { getRankPoints } from "@/utils/rankingSystem";

interface MatchTeamBalancingProps {
  matchId: string;
  team1Id?: string | null;
  team2Id?: string | null;
  tournamentId: string;
  onTeamsRebalanced: () => void;
}

interface TeamData {
  id: string;
  name: string;
  members: Array<{
    user_id: string;
    discord_username: string;
    rank_points: number;
    current_rank: string;
  }>;
  totalRankPoints: number;
  avgRankPoints: number;
}

const MatchTeamBalancing = ({ 
  matchId, 
  team1Id, 
  team2Id, 
  tournamentId,
  onTeamsRebalanced 
}: MatchTeamBalancingProps) => {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(false);
  const [balanceAnalysis, setBalanceAnalysis] = useState<any>(null);
  const { toast } = useToast();
  const { notifyTeamAssigned } = useEnhancedNotifications();

  useEffect(() => {
    if (team1Id && team2Id) {
      fetchTeamData();
    }
  }, [team1Id, team2Id]);

  const fetchTeamData = async () => {
    if (!team1Id || !team2Id) return;

    try {
      const { data: teamsData } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          team_members (
            user_id,
            users (
              discord_username,
              current_rank,
              rank_points
            )
          )
        `)
        .in('id', [team1Id, team2Id]);

      if (teamsData) {
        const processedTeams = teamsData.map(team => {
          const members = team.team_members
            .map(tm => tm.users)
            .filter(user => user)
            .map(user => ({
              user_id: tm.user_id,
              discord_username: user.discord_username || 'Unknown',
              rank_points: user.rank_points || getRankPoints(user.current_rank || 'Unranked'),
              current_rank: user.current_rank || 'Unranked'
            }));

          const totalRankPoints = members.reduce((sum, member) => sum + member.rank_points, 0);
          const avgRankPoints = members.length > 0 ? totalRankPoints / members.length : 0;

          return {
            id: team.id,
            name: team.name,
            members,
            totalRankPoints,
            avgRankPoints
          };
        });

        setTeams(processedTeams);
        calculateBalanceAnalysis(processedTeams);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  const calculateBalanceAnalysis = (teamData: TeamData[]) => {
    if (teamData.length !== 2) return;

    const [team1, team2] = teamData;
    const difference = Math.abs(team1.avgRankPoints - team2.avgRankPoints);
    
    let status = 'excellent';
    let color = 'text-green-400';
    
    if (difference > 200) {
      status = 'poor';
      color = 'text-red-400';
    } else if (difference > 100) {
      status = 'fair';
      color = 'text-yellow-400';
    } else if (difference > 50) {
      status = 'good';
      color = 'text-blue-400';
    }

    setBalanceAnalysis({
      difference: Math.round(difference),
      status,
      color,
      team1Points: Math.round(team1.avgRankPoints),
      team2Points: Math.round(team2.avgRankPoints)
    });
  };

  const autoBalanceTeams = async () => {
    if (!team1Id || !team2Id || teams.length !== 2) return;

    setLoading(true);
    try {
      // Get all players from both teams
      const allPlayers = teams.flatMap(team => team.members);
      
      // Sort players by rank points (highest first)
      const sortedPlayers = [...allPlayers].sort((a, b) => b.rank_points - a.rank_points);

      // Use snake draft to balance teams
      const newTeam1: any[] = [];
      const newTeam2: any[] = [];
      
      sortedPlayers.forEach((player, index) => {
        if (index % 4 === 0 || index % 4 === 3) {
          newTeam1.push(player);
        } else {
          newTeam2.push(player);
        }
      });

      // Update team memberships
      await updateTeamMembership(team1Id, newTeam1);
      await updateTeamMembership(team2Id, newTeam2);

      // Notify players of new assignments
      const team1Name = teams.find(t => t.id === team1Id)?.name || 'Team 1';
      const team2Name = teams.find(t => t.id === team2Id)?.name || 'Team 2';

      await notifyTeamAssigned(team1Id, team1Name, newTeam1.map(p => p.user_id));
      await notifyTeamAssigned(team2Id, team2Name, newTeam2.map(p => p.user_id));

      toast({
        title: "Teams Rebalanced",
        description: "Match teams have been automatically balanced",
      });

      onTeamsRebalanced();
      fetchTeamData();
    } catch (error) {
      console.error('Error rebalancing teams:', error);
      toast({
        title: "Error",
        description: "Failed to rebalance teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTeamMembership = async (teamId: string, newMembers: any[]) => {
    // Remove all current members
    await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId);

    // Add new members
    if (newMembers.length > 0) {
      const membersToInsert = newMembers.map((member, index) => ({
        team_id: teamId,
        user_id: member.user_id,
        is_captain: index === 0 // First member (highest rank) is captain
      }));

      await supabase
        .from('team_members')
        .insert(membersToInsert);
    }
  };

  if (!team1Id || !team2Id) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Match Team Balancing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-center py-4">
            Both teams must be assigned before balancing can be performed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Match Team Balancing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {balanceAnalysis && (
          <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-sm">Balance Status:</span>
              <Badge className={`${balanceAnalysis.color} bg-slate-600 border-slate-500`}>
                {balanceAnalysis.status.toUpperCase()}
              </Badge>
            </div>
            <span className="text-slate-300 text-sm">
              Difference: {balanceAnalysis.difference} points
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {teams.map(team => (
            <div key={team.id} className="bg-slate-700 p-3 rounded-lg">
              <h4 className="text-white font-medium mb-2">{team.name}</h4>
              <div className="text-sm text-slate-300 mb-2">
                Avg: {Math.round(team.avgRankPoints)} pts
              </div>
              <div className="space-y-1">
                {team.members.map(member => (
                  <div key={member.user_id} className="text-xs text-slate-400 flex justify-between">
                    <span>{member.discord_username}</span>
                    <span>{member.rank_points}pts</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={autoBalanceTeams}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          {loading ? 'Rebalancing...' : 'Auto Rebalance Teams'}
        </Button>

        <div className="text-xs text-slate-400 bg-slate-700 p-2 rounded">
          <strong>Note:</strong> This will redistribute players using snake draft algorithm 
          to create more balanced teams. Players will be notified of changes.
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchTeamBalancing;
