import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { 
  UserPlus, 
  Search, 
  Target, 
  Trophy, 
  Crown,
  Weight,
  TrendingUp,
  User,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamToAddPlayer {
  teamId: string;
  tournamentId: string;
}

interface PlayerAdditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamToAddPlayer: TeamToAddPlayer | null;
  onSuccess: () => void;
}

interface SearchResult {
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

export const PlayerAdditionDialog: React.FC<PlayerAdditionDialogProps> = ({
  open,
  onOpenChange,
  teamToAddPlayer,
  onSuccess
}) => {
  const { toast } = useToast();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<SearchResult | null>(null);
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [tournament, setTournament] = useState<TournamentDetails | null>(null);
  const [reason, setReason] = useState("");
  const [makeCaptain, setMakeCaptain] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Load team and tournament details when dialog opens
  useEffect(() => {
    if (open && teamToAddPlayer) {
      loadTeamDetails();
      setSelectedPlayer(null);
      setSearchQuery("");
      setSearchResults([]);
      setReason("");
      setMakeCaptain(false);
    }
  }, [open, teamToAddPlayer]);

  const loadTeamDetails = async () => {
    if (!teamToAddPlayer) return;
    
    setLoading(true);
    try {
      // Load team details
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamToAddPlayer.teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Load tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", teamToAddPlayer.tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);
      
    } catch (err: any) {
      console.error("Error loading team details:", err);
      toast({
        title: "Error Loading Details",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchPlayers = async () => {
    if (!searchQuery.trim() || !teamToAddPlayer) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id, discord_username, current_rank, riot_id, rank_points,
          wins, losses, tournaments_won, tournaments_played, weight_rating,
          manual_weight_override, use_manual_override
        `)
        .or(`discord_username.ilike.%${searchQuery}%,riot_id.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Filter out users already on teams in this tournament
      const { data: existingMembers, error: memberError } = await supabase
        .from("team_members")
        .select("user_id, teams!inner(tournament_id)")
        .eq("teams.tournament_id", teamToAddPlayer.tournamentId);

      if (memberError) throw memberError;

      const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);
      const availablePlayers = data?.filter(player => !existingUserIds.has(player.id)) || [];
      
      setSearchResults(availablePlayers);
      
    } catch (err: any) {
      console.error("Error searching players:", err);
      toast({
        title: "Error Searching Players",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!selectedPlayer || !teamToAddPlayer || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a player and provide a reason.",
        variant: "destructive"
      });
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase.rpc("add_player_to_team", {
        p_team_id: teamToAddPlayer.teamId,
        p_user_id: selectedPlayer.id,
        p_tournament_id: teamToAddPlayer.tournamentId,
        p_is_captain: makeCaptain,
        p_reason: reason.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Player Added Successfully",
          description: `${selectedPlayer.discord_username} has been added to the team. Team weight updated from ${result.original_weight} to ${result.new_weight}.`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(result.error || "Failed to add player");
      }

    } catch (err: any) {
      console.error("Error adding player:", err);
      toast({
        title: "Error Adding Player",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setAdding(false);
    }
  };

  const getPlayerWeight = (player: SearchResult) => {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchPlayers();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-green-400">
            <UserPlus className="h-5 w-5" />
            Add Player to Team
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
            <span className="ml-3 text-slate-400">Loading team details...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Team & Tournament Context */}
            {team && tournament && (
              <div className="p-4 bg-slate-750 rounded-lg border border-slate-600">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-400" />
                      Target Team
                    </h3>
                    <div className="text-white font-medium">{team.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{team.status}</Badge>
                      <span className="text-slate-400 text-xs">
                        <Weight className="inline h-3 w-3 mr-1" />
                        {team.total_rank_points} weight
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      Tournament
                    </h3>
                    <div className="text-white font-medium">{tournament.name}</div>
                    <Badge variant="outline" className="text-xs mt-1">{tournament.status}</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Player Search */}
            <div className="space-y-3">
              <Label className="text-slate-300">Search for Player</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by Discord username or Riot ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <Button
                  onClick={searchPlayers}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {searching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <Label className="text-slate-300">Search Results ({searchResults.length} found)</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map(player => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlayer?.id === player.id
                          ? "bg-green-900/30 border-green-600"
                          : "bg-slate-750 border-slate-600 hover:bg-slate-700"
                      }`}
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {selectedPlayer?.id === player.id && (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            )}
                            <User className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{player.discord_username}</div>
                            <div className="text-sm text-slate-400">
                              {player.riot_id || "No Riot ID"}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <Badge className={`text-xs ${getRankBadgeColor(player.current_rank)}`}>
                              {player.current_rank || "Unranked"}
                            </Badge>
                            <div className="text-slate-400 text-xs mt-1">
                              Weight: {getPlayerWeight(player)}
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            <div>W: {player.wins || 0} L: {player.losses || 0}</div>
                            <div>Tournaments: {player.tournaments_won || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !searching && (
              <Alert className="bg-yellow-900/20 border-yellow-800">
                <Search className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  No players found matching your search criteria. Try a different username or Riot ID.
                </AlertDescription>
              </Alert>
            )}

            {/* Selected Player Details */}
            {selectedPlayer && (
              <div className="space-y-4">
                <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                  <h3 className="font-semibold text-green-400 flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4" />
                    Selected Player
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-white">{selectedPlayer.discord_username}</span>
                      </div>
                      <div className="text-slate-400 text-sm">
                        {selectedPlayer.riot_id || "No Riot ID set"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getRankBadgeColor(selectedPlayer.current_rank)}`}>
                          {selectedPlayer.current_rank || "Unranked"}
                        </Badge>
                        <span className="text-slate-400 text-sm">
                          Weight: {getPlayerWeight(selectedPlayer)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Wins/Losses:</span>
                        <span className="text-white">{selectedPlayer.wins || 0}/{selectedPlayer.losses || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tournaments Won:</span>
                        <span className="text-white">{selectedPlayer.tournaments_won || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tournaments Played:</span>
                        <span className="text-white">{selectedPlayer.tournaments_played || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Weight Impact */}
                {team && (
                  <Alert className="bg-blue-900/20 border-blue-800">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-200">
                      <strong>Team Weight Impact:</strong> Adding this player (weight: {getPlayerWeight(selectedPlayer)}) 
                      will increase the team's total weight to {team.total_rank_points + getPlayerWeight(selectedPlayer)} points.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Captain Option */}
                <div className="flex items-center justify-between p-3 bg-slate-750 rounded-lg border border-slate-600">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-400" />
                    <Label className="text-slate-300">Make Team Captain</Label>
                  </div>
                  <Switch
                    checked={makeCaptain}
                    onCheckedChange={setMakeCaptain}
                  />
                </div>

                {/* Reason Input */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Reason for Addition *</Label>
                  <Input
                    placeholder="Explain why this player is being added..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                  <p className="text-xs text-slate-400">
                    This reason will be logged in the audit trail for transparency.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="text-slate-300 border-slate-600"
                disabled={adding}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPlayer}
                className="bg-green-600 hover:bg-green-700"
                disabled={adding || !selectedPlayer || !reason.trim()}
              >
                {adding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add to Team
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