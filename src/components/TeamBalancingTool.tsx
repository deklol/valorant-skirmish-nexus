
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Users, AlertCircle } from "lucide-react";
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
  const [balanceMethod, setBalanceMethod] = useState('weight_based');
  const { toast } = useToast();
  const { notifyTeamAssigned } = useNotifications();

  const getRankWeight = (rank: string | null) => {
    const rankWeights: Record<string, number> = {
      'Iron': 100,
      'Bronze': 150,
      'Silver': 200,
      'Gold': 250,
      'Platinum': 300,
      'Diamond': 350,
      'Ascendant': 400,
      'Immortal': 450,
      'Radiant': 500,
      'Phantom': 150
    };

    if (!rank) return 150;
    
    for (const [rankName, weight] of Object.entries(rankWeights)) {
      if (rank.toLowerCase().includes(rankName.toLowerCase())) {
        return weight;
      }
    }
    
    return 150;
  };

  const balanceTeams = async () => {
    setLoading(true);
    
    try {
      // Get all checked-in participants
      const { data: signups, error: signupsError } = await supabase
        .from('tournament_signups')
        .select(`
          *,
          users:user_id (
            id,
            discord_username,
            riot_id,
            current_rank,
            weight_rating,
            is_phantom
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('is_checked_in', true);

      if (signupsError) throw signupsError;

      if (!signups || signups.length === 0) {
        toast({
          title: "No Participants",
          description: "No checked-in participants found for balancing",
          variant: "destructive",
        });
        return;
      }

      // Clear existing teams
      await supabase.from('team_members').delete().match({ 
        team_id: await supabase.from('teams').select('id').eq('tournament_id', tournamentId).then(res => 
          res.data?.map(t => t.id) || []
        )
      });
      await supabase.from('teams').delete().eq('tournament_id', tournamentId);

      // Calculate team count
      const teamCount = Math.min(Math.floor(signups.length / 5), maxTeams);
      
      if (teamCount === 0) {
        toast({
          title: "Insufficient Players",
          description: "Need at least 5 players to form teams",
          variant: "destructive",
        });
        return;
      }

      // Sort players by weight for balancing
      const players = signups
        .map(signup => ({
          ...signup.users,
          weight: balanceMethod === 'weight_based' 
            ? (signup.users?.weight_rating || getRankWeight(signup.users?.current_rank))
            : getRankWeight(signup.users?.current_rank)
        }))
        .sort((a, b) => (b.weight || 0) - (a.weight || 0));

      // Create teams
      const teams = [];
      for (let i = 0; i < teamCount; i++) {
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .insert({
            tournament_id: tournamentId,
            name: `Team ${String.fromCharCode(65 + i)}`,
            total_rank_points: 0
          })
          .select()
          .single();

        if (teamError) throw teamError;
        teams.push({ ...team, members: [], totalWeight: 0 });
      }

      // Balance players across teams using snake draft
      let currentTeam = 0;
      let direction = 1;

      for (const player of players) {
        const team = teams[currentTeam];
        
        // Add player to team
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: team.id,
            user_id: player.id,
            is_captain: team.members.length === 0 // First player is captain
          });

        if (memberError) throw memberError;

        team.members.push(player);
        team.totalWeight += player.weight || 0;

        // Move to next team
        currentTeam += direction;
        if (currentTeam >= teamCount) {
          currentTeam = teamCount - 1;
          direction = -1;
        } else if (currentTeam < 0) {
          currentTeam = 0;
          direction = 1;
        }

        // Send team assignment notification
        await notifyTeamAssigned(team.id, team.name, [player.id]);
      }

      // Update team total rank points
      for (const team of teams) {
        await supabase
          .from('teams')
          .update({ total_rank_points: team.totalWeight })
          .eq('id', team.id);
      }

      toast({
        title: "Teams Balanced Successfully",
        description: `Created ${teamCount} balanced teams with ${players.length} players`,
      });

      onTeamsBalanced();

    } catch (error: any) {
      console.error('Error balancing teams:', error);
      toast({
        title: "Balancing Failed",
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
          <Shuffle className="w-5 h-5" />
          Team Balancing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Balancing Method</label>
          <Select value={balanceMethod} onValueChange={setBalanceMethod}>
            <SelectTrigger className="bg-slate-700 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weight_based">Weight Rating Based</SelectItem>
              <SelectItem value="rank_based">Rank Based</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Only checked-in players will be included in teams</span>
        </div>

        <Button
          onClick={balanceTeams}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 w-full"
        >
          {loading ? (
            "Balancing..."
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Balance Teams
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TeamBalancingTool;
