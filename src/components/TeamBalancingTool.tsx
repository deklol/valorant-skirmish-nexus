
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shuffle, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";

interface TeamBalancingToolProps {
  tournamentId: string;
  maxTeams: number;
  onTeamsBalanced: () => void;
}

const TeamBalancingTool = ({ tournamentId, maxTeams, onTeamsBalanced }: TeamBalancingToolProps) => {
  const [loading, setLoading] = useState(false);
  const [balancingStatus, setBalancingStatus] = useState<'idle' | 'balancing' | 'complete'>('idle');
  const { toast } = useToast();
  const { notifyTeamAssigned } = useNotifications();

  const balanceTeams = async () => {
    setLoading(true);
    setBalancingStatus('balancing');

    try {
      // Get tournament details
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('name')
        .eq('id', tournamentId)
        .single();

      if (!tournament) throw new Error('Tournament not found');

      // Get all signups with user details and rank points
      const { data: signups } = await supabase
        .from('tournament_signups')
        .select(`
          user_id,
          users:user_id (
            discord_username,
            rank_points,
            current_rank,
            weight_rating
          )
        `)
        .eq('tournament_id', tournamentId);

      if (!signups || signups.length === 0) {
        throw new Error('No signups found for this tournament');
      }

      // Calculate team size
      const teamSize = Math.floor(signups.length / maxTeams);
      if (teamSize < 2) {
        throw new Error('Not enough players to form teams');
      }

      // Clear existing teams
      await supabase
        .from('team_members')
        .delete()
        .in('team_id', 
          (await supabase
            .from('teams')
            .select('id')
            .eq('tournament_id', tournamentId)
          ).data?.map(t => t.id) || []
        );

      await supabase
        .from('teams')
        .delete()
        .eq('tournament_id', tournamentId);

      // Sort players by rank points (descending)
      const sortedPlayers = signups
        .filter(signup => signup.users)
        .sort((a, b) => (b.users?.rank_points || 0) - (a.users?.rank_points || 0));

      // Create teams using snake draft algorithm
      const teams: any[][] = Array(maxTeams).fill(null).map(() => []);
      let currentTeam = 0;
      let direction = 1; // 1 for forward, -1 for backward

      for (const player of sortedPlayers) {
        teams[currentTeam].push(player);
        
        // Move to next team
        currentTeam += direction;
        
        // Reverse direction when we reach the end
        if (currentTeam === maxTeams) {
          currentTeam = maxTeams - 1;
          direction = -1;
        } else if (currentTeam === -1) {
          currentTeam = 0;
          direction = 1;
        }
      }

      // Create teams in database
      for (let i = 0; i < teams.length; i++) {
        if (teams[i].length === 0) continue;

        const teamName = `Team ${String.fromCharCode(65 + i)}`; // Team A, Team B, etc.
        
        // Calculate total rank points for the team
        const totalRankPoints = teams[i].reduce((sum, player) => 
          sum + (player.users?.rank_points || 0), 0
        );

        // Create team
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            tournament_id: tournamentId,
            total_rank_points: totalRankPoints,
            seed: i + 1
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Add team members
        for (let j = 0; j < teams[i].length; j++) {
          const player = teams[i][j];
          const isCaptain = j === 0; // First player (highest rank) is captain

          await supabase
            .from('team_members')
            .insert({
              team_id: newTeam.id,
              user_id: player.user_id,
              is_captain: isCaptain
            });
        }

        // Send notifications to team members
        const userIds = teams[i].map(player => player.user_id);
        await notifyTeamAssigned(newTeam.id, teamName, userIds, tournament.name);
      }

      setBalancingStatus('complete');
      
      toast({
        title: "Teams Balanced Successfully",
        description: `${maxTeams} teams have been created and players have been notified`,
      });

      onTeamsBalanced();
      
    } catch (error: any) {
      console.error('Error balancing teams:', error);
      setBalancingStatus('idle');
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
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Balancing Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-slate-300 text-sm">
          <p>This tool will automatically balance teams based on player rank points using a snake draft algorithm.</p>
          <p className="mt-2">The highest-ranked player in each team will be assigned as captain.</p>
        </div>

        {balancingStatus === 'idle' && (
          <Button
            onClick={balanceTeams}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            {loading ? "Balancing Teams..." : "Balance Teams"}
          </Button>
        )}

        {balancingStatus === 'balancing' && (
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Balancing teams and sending notifications...</span>
          </div>
        )}

        {balancingStatus === 'complete' && (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Teams balanced successfully! Players have been notified.</span>
          </div>
        )}

        <div className="bg-slate-700 p-3 rounded-lg">
          <div className="text-sm text-slate-400 mb-2">Balancing Algorithm:</div>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Players sorted by rank points (highest first)</li>
            <li>• Snake draft assignment to ensure balanced teams</li>
            <li>• Highest-ranked player becomes team captain</li>
            <li>• All players notified with their team assignment</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamBalancingTool;
