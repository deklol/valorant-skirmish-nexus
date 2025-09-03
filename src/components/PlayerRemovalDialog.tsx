import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  UserMinus, 
  AlertTriangle, 
  Target, 
  Trophy, 
  Activity,
  Crown,
  Weight,
  TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlayerToRemove {
  userId: string;
  teamId: string;
  tournamentId: string;
}

interface PlayerRemovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerToRemove: PlayerToRemove | null;
  onSuccess: () => void;
}

interface PlayerDetails {
  id: string;
  discord_username: string;
  current_rank: string;
  riot_id: string | null;
  rank_points: number;
  wins: number;
  losses: number;
  tournaments_won: number;
  tournaments_played: number;
  weight_rating: number;
  manual_weight_override: number | null;
  use_manual_override: boolean;
}

interface TeamDetails {
  id: string;
  name: string;
  status: string;
  total_rank_points: number;
}

interface TournamentDetails {
  id: string;
  name: string;
  status: string;
}

interface StatImpact {
  wins_reversed: number;
  losses_reversed: number;
  tournaments_played_reversed: number;
  tournaments_won_reversed: number;
}

export const PlayerRemovalDialog: React.FC<PlayerRemovalDialogProps> = ({
  open,
  onOpenChange,
  playerToRemove,
  onSuccess
}) => {
  const { toast } = useToast();
  
  // State
  const [player, setPlayer] = useState<PlayerDetails | null>(null);
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [tournament, setTournament] = useState<TournamentDetails | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [statImpact, setStatImpact] = useState<StatImpact | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  
  // Load player details when dialog opens
  useEffect(() => {
    if (open && playerToRemove) {
      loadPlayerDetails();
    } else if (!open) {
      // Reset state when dialog closes
      setPlayer(null);
      setTeam(null);
      setTournament(null);
      setReason("");
      setStatImpact(null);
      setIsCaptain(false);
    }
  }, [open, playerToRemove]);

  const loadPlayerDetails = async () => {
    if (!playerToRemove) return;
    
    setLoading(true);
    try {
      // Load player details
      const { data: playerData, error: playerError } = await supabase
        .from("users")
        .select("*")
        .eq("id", playerToRemove.userId)
        .single();

      if (playerError) throw playerError;
      setPlayer(playerData);

      // Load team details
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", playerToRemove.teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Load tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", playerToRemove.tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Check if player is captain
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("is_captain")
        .eq("team_id", playerToRemove.teamId)
        .eq("user_id", playerToRemove.userId)
        .single();

      if (memberError) throw memberError;
      setIsCaptain(memberData.is_captain);

      // Calculate potential stat impact
      await calculateStatImpact();
      
    } catch (err: any) {
      console.error("Error loading player details:", err);
      toast({
        title: "Error Loading Player Details",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatImpact = async () => {
    if (!playerToRemove) return;
    
    try {
      // Count wins/losses in this tournament
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id, winner_id, team1_id, team2_id, status")
        .eq("tournament_id", playerToRemove.tournamentId)
        .eq("status", "completed")
        .not("winner_id", "is", null);

      if (matchError) throw matchError;

      let winsReversed = 0;
      let lossesReversed = 0;

      // Count matches where this team participated
      const teamMatches = matchData.filter(match => 
        match.team1_id === playerToRemove.teamId || match.team2_id === playerToRemove.teamId
      );

      teamMatches.forEach(match => {
        if (match.winner_id === playerToRemove.teamId) {
          winsReversed++;
        } else {
          lossesReversed++;
        }
      });

      // Check if team won tournament
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("status")
        .eq("id", playerToRemove.teamId)
        .single();

      if (teamError) throw teamError;

      const tournamentsWonReversed = teamData.status === "winner" ? 1 : 0;

      setStatImpact({
        wins_reversed: winsReversed,
        losses_reversed: lossesReversed,
        tournaments_played_reversed: 1,
        tournaments_won_reversed: tournamentsWonReversed
      });

    } catch (err: any) {
      console.error("Error calculating stat impact:", err);
    }
  };

  const handleRemovePlayer = async () => {
    if (!playerToRemove || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for removing this player.",
        variant: "destructive"
      });
      return;
    }

    setRemoving(true);
    try {
      const { data, error } = await supabase.rpc("remove_player_from_team", {
        p_team_id: playerToRemove.teamId,
        p_user_id: playerToRemove.userId,
        p_tournament_id: playerToRemove.tournamentId,
        p_reason: reason.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Player Removed Successfully",
          description: `Player has been removed from the team. Team weight updated from ${result.original_weight} to ${result.new_weight}.`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(result.error || "Failed to remove player");
      }

    } catch (err: any) {
      console.error("Error removing player:", err);
      toast({
        title: "Error Removing Player",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setRemoving(false);
    }
  };

  const getPlayerWeight = () => {
    if (!player) return 150;
    if (player.use_manual_override && player.manual_weight_override !== null) {
      return player.manual_weight_override;
    }
    return player.rank_points || player.weight_rating || 150;
  };

  const getRankBadgeColor = (rank: string) => {
    const rankLower = rank?.toLowerCase() || "";
    if (rankLower.includes("iron")) return "bg-amber-900 text-amber-200";
    if (rankLower.includes("bronze")) return "bg-orange-900 text-orange-200";
    if (rankLower.includes("silver")) return "bg-slate-600 text-slate-200";
    if (rankLower.includes("gold")) return "bg-yellow-600 text-yellow-200";
    if (rankLower.includes("platinum")) return "bg-cyan-600 text-cyan-200";
    if (rankLower.includes("diamond")) return "bg-blue-600 text-blue-200";
    if (rankLower.includes("ascendant")) return "bg-green-600 text-green-200";
    if (rankLower.includes("immortal")) return "bg-red-600 text-red-200";
    if (rankLower.includes("radiant")) return "bg-purple-600 text-purple-200";
    return "bg-slate-600 text-slate-200";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-red-400">
            <UserMinus className="h-5 w-5" />
            Remove Player from Team
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400"></div>
            <span className="ml-3 text-slate-400">Loading player details...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Warning Alert */}
            <Alert className="bg-red-900/20 border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                <strong>Warning:</strong> Removing a player will permanently reverse their stats 
                from this tournament and update team weights. This action cannot be undone.
              </AlertDescription>
            </Alert>

            {/* Player Information */}
            {player && team && tournament && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Player Details */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-400" />
                      Player Details
                    </h3>
                    <div className="p-4 bg-slate-750 rounded-lg border border-slate-600">
                      <div className="flex items-center gap-3 mb-3">
                        {isCaptain && <Crown className="h-4 w-4 text-yellow-400" />}
                        <div>
                          <div className="font-medium text-white flex items-center gap-2">
                            {player.discord_username}
                            {isCaptain && (
                              <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400">
                                Captain
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-400">
                            {player.riot_id || "No Riot ID"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-400">Rank:</span>
                          <Badge className={`ml-2 text-xs ${getRankBadgeColor(player.current_rank)}`}>
                            {player.current_rank || "Unranked"}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-slate-400">Weight:</span>
                          <span className="text-white ml-2 font-medium">{getPlayerWeight()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">W/L:</span>
                          <span className="text-white ml-2">{player.wins || 0}/{player.losses || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Tournaments Won:</span>
                          <span className="text-white ml-2">{player.tournaments_won || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Team & Tournament Info */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      Context
                    </h3>
                    <div className="p-4 bg-slate-750 rounded-lg border border-slate-600 space-y-3">
                      <div>
                        <span className="text-slate-400">Team:</span>
                        <div className="text-white font-medium">{team.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{team.status}</Badge>
                          <span className="text-slate-400 text-xs">
                            <Weight className="inline h-3 w-3 mr-1" />
                            {team.total_rank_points} weight
                          </span>
                        </div>
                      </div>
                      
                      <Separator className="bg-slate-600" />
                      
                      <div>
                        <span className="text-slate-400">Tournament:</span>
                        <div className="text-white font-medium">{tournament.name}</div>
                        <Badge variant="outline" className="text-xs mt-1">{tournament.status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistics Impact */}
                {statImpact && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                      Statistics Impact (Will be reversed)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-750 rounded border border-slate-600 text-center">
                        <div className="text-red-400 font-bold text-lg">-{statImpact.wins_reversed}</div>
                        <div className="text-slate-400 text-xs">Wins</div>
                      </div>
                      <div className="p-3 bg-slate-750 rounded border border-slate-600 text-center">
                        <div className="text-red-400 font-bold text-lg">-{statImpact.losses_reversed}</div>
                        <div className="text-slate-400 text-xs">Losses</div>
                      </div>
                      <div className="p-3 bg-slate-750 rounded border border-slate-600 text-center">
                        <div className="text-red-400 font-bold text-lg">-{statImpact.tournaments_played_reversed}</div>
                        <div className="text-slate-400 text-xs">Tournaments Played</div>
                      </div>
                      <div className="p-3 bg-slate-750 rounded border border-slate-600 text-center">
                        <div className="text-red-400 font-bold text-lg">-{statImpact.tournaments_won_reversed}</div>
                        <div className="text-slate-400 text-xs">Tournament Wins</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Weight Impact */}
                <Alert className="bg-orange-900/20 border-orange-800">
                  <Weight className="h-4 w-4 text-orange-400" />
                  <AlertDescription className="text-orange-200">
                    <strong>Team Weight Impact:</strong> Removing this player (weight: {getPlayerWeight()}) 
                    will reduce the team's total weight by {getPlayerWeight()} points, affecting tournament balance.
                  </AlertDescription>
                </Alert>

                {/* Captain Warning */}
                {isCaptain && (
                  <Alert className="bg-yellow-900/20 border-yellow-800">
                    <Crown className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-200">
                      <strong>Captain Warning:</strong> This player is the team captain. 
                      Removing them may require designating a new captain.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Reason Input */}
            <div className="space-y-2">
              <Label className="text-slate-300">Reason for Removal *</Label>
              <Input
                placeholder="Explain why this player is being removed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
              <p className="text-xs text-slate-400">
                This reason will be logged in the audit trail for transparency.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="text-slate-300 border-slate-600"
                disabled={removing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRemovePlayer}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                disabled={removing || !reason.trim()}
              >
                {removing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove Player
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};