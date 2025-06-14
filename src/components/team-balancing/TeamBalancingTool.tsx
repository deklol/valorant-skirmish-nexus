
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTeamBalancingLogic } from "./TeamBalancingLogic";
import { BalancingStatus } from "./BalancingStatus";
import { BalancingInfo } from "./BalancingInfo";

interface TeamBalancingToolProps {
  tournamentId: string;
  maxTeams: number;
  onTeamsBalanced: () => void;
}

const TeamBalancingTool = ({ tournamentId, maxTeams, onTeamsBalanced }: TeamBalancingToolProps) => {
  const [loading, setLoading] = useState(false);
  const [balancingStatus, setBalancingStatus] = useState<'idle' | 'balancing' | 'complete'>('idle');
  const { toast } = useToast();
  const { balanceTeams } = useTeamBalancingLogic({ tournamentId, maxTeams, onTeamsBalanced });

  const handleBalanceTeams = async () => {
    setLoading(true);
    setBalancingStatus('balancing');

    try {
      await balanceTeams();
      
      setBalancingStatus('complete');
      
      toast({
        title: "Teams Balanced Successfully",
        description: `Teams have been created and players have been notified`,
      });
      
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
          Auto Team Balancing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-slate-300 text-sm">
          <p>This tool will automatically balance teams based on player rank points.</p>
          <p className="mt-2">Only checked-in players will be included in team formation.</p>
          <p className="mt-1">For 1v1 tournaments, each player gets their own team. For team tournaments, players are distributed using snake draft algorithm.</p>
          <p className="mt-1">The highest-ranked player in each team will be assigned as captain.</p>
        </div>

        {balancingStatus === 'idle' && (
          <Button
            onClick={handleBalanceTeams}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            {loading ? "Balancing Teams..." : "Auto Balance Teams"}
          </Button>
        )}

        <BalancingStatus status={balancingStatus} />
        <BalancingInfo />
      </CardContent>
    </Card>
  );
};

export default TeamBalancingTool;
