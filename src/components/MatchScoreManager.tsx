import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Users, Clock, Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Match {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  status: "pending" | "live" | "completed";
  score_team1: number;
  score_team2: number;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  best_of: number;
  team1?: { name: string; id: string } | null;
  team2?: { name: string; id: string } | null;
  winner?: { name: string; id: string } | null;
}

interface MatchScoreManagerProps {
  tournamentId: string;
  matches: Match[];
  onScoreUpdate: () => void;
}

const MatchScoreManager = ({ tournamentId, matches, onScoreUpdate }: MatchScoreManagerProps) => {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [tempScores, setTempScores] = useState<{ team1: number; team2: number }>({ team1: 0, team2: 0 });
  const [tempStatus, setTempStatus] = useState<"pending" | "live" | "completed">("pending");
  const { toast } = useToast();

  const startEditing = (match: Match) => {
    setEditingMatch(match.id);
    setTempScores({ team1: match.score_team1, team2: match.score_team2 });
    setTempStatus(match.status);
  };

  const cancelEditing = () => {
    setEditingMatch(null);
    setTempScores({ team1: 0, team2: 0 });
    setTempStatus("pending");
  };

  const saveMatch = async (match: Match) => {
    try {
      const winnerId = tempScores.team1 > tempScores.team2 ? match.team1_id : 
                      tempScores.team2 > tempScores.team1 ? match.team2_id : null;

      const { error } = await supabase
        .from('matches')
        .update({
          score_team1: tempScores.team1,
          score_team2: tempScores.team2,
          winner_id: winnerId,
          status: tempStatus,
          completed_at: tempStatus === 'completed' ? new Date().toISOString() : null,
          started_at: tempStatus === 'live' && !match.started_at ? new Date().toISOString() : match.started_at
        })
        .eq('id', match.id);

      if (error) throw error;

      // If this match is completed and has a winner, advance to next round
      if (tempStatus === 'completed' && winnerId) {
        await advanceWinner(match, winnerId);
      }

      toast({
        title: "Success",
        description: "Match updated successfully",
      });

      setEditingMatch(null);
      onScoreUpdate();
    } catch (error: any) {
      console.error('Error updating match:', error);
      toast({
        title: "Error",
        description: "Failed to update match",
        variant: "destructive",
      });
    }
  };

  const advanceWinner = async (currentMatch: Match, winnerId: string) => {
    try {
      // Find the next round match that this winner should advance to
      const nextRound = currentMatch.round_number + 1;
      const nextMatchNumber = Math.ceil(currentMatch.match_number / 2);

      const { data: nextMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round_number', nextRound)
        .eq('match_number', nextMatchNumber)
        .single();

      if (nextMatch) {
        // Determine if winner goes to team1 or team2 slot
        const isTeam1Slot = currentMatch.match_number % 2 === 1;
        const updateField = isTeam1Slot ? 'team1_id' : 'team2_id';

        await supabase
          .from('matches')
          .update({ [updateField]: winnerId })
          .eq('id', nextMatch.id);
      }
    } catch (error) {
      console.error('Error advancing winner:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gray-500/20 text-gray-400",
      live: "bg-red-500/20 text-red-400",
      completed: "bg-green-500/20 text-green-400"
    };

    return (
      <Badge className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "TBD";
    return new Date(timeString).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getRoundName = (roundNumber: number) => {
    const maxRounds = Math.max(...matches.map(m => m.round_number));
    if (roundNumber === maxRounds) return "Final";
    if (roundNumber === maxRounds - 1) return "Semi-Final";
    if (roundNumber === maxRounds - 2) return "Quarter-Final";
    return `Round ${roundNumber}`;
  };

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round_number]) {
      acc[match.round_number] = [];
    }
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Match Score Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(matchesByRound)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([round, roundMatches]) => (
            <div key={round} className="space-y-3">
              <h3 className="text-lg font-semibold text-white">
                {getRoundName(parseInt(round))}
              </h3>
              
              <div className="grid gap-3">
                {roundMatches.map((match) => (
                  <div key={match.id} className="bg-slate-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">Match {match.match_number}</span>
                        {getStatusBadge(match.status)}
                        <span className="text-slate-400 text-sm">
                          BO{match.best_of}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(match.scheduled_time)}
                        </span>
                        {editingMatch === match.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 h-6 px-2"
                              onClick={() => saveMatch(match)}
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 h-6 px-2"
                              onClick={cancelEditing}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-600 h-6 px-2"
                            onClick={() => startEditing(match)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      {/* Team 1 */}
                      <div className={`text-center p-3 rounded ${
                        match.winner_id === match.team1_id ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-600'
                      }`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-white font-medium">
                            {match.team1?.name || "TBD"}
                          </span>
                          {match.winner_id === match.team1_id && (
                            <Trophy className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        {editingMatch === match.id ? (
                          <Input
                            type="number"
                            min="0"
                            value={tempScores.team1}
                            onChange={(e) => setTempScores(prev => ({ ...prev, team1: parseInt(e.target.value) || 0 }))}
                            className="w-16 mx-auto text-center bg-slate-800 border-slate-600"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">{match.score_team1}</span>
                        )}
                      </div>

                      {/* VS / Status */}
                      <div className="text-center">
                        {editingMatch === match.id ? (
                          <Select value={tempStatus} onValueChange={(value: "pending" | "live" | "completed") => setTempStatus(value)}>
                            <SelectTrigger className="w-24 mx-auto bg-slate-800 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="live">Live</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-slate-400 font-medium">VS</div>
                            {match.status === "live" && (
                              <div className="flex items-center justify-center gap-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-red-400 text-xs">LIVE</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Team 2 */}
                      <div className={`text-center p-3 rounded ${
                        match.winner_id === match.team2_id ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-600'
                      }`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-white font-medium">
                            {match.team2?.name || "TBD"}
                          </span>
                          {match.winner_id === match.team2_id && (
                            <Trophy className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        {editingMatch === match.id ? (
                          <Input
                            type="number"
                            min="0"
                            value={tempScores.team2}
                            onChange={(e) => setTempScores(prev => ({ ...prev, team2: parseInt(e.target.value) || 0 }))}
                            className="w-16 mx-auto text-center bg-slate-800 border-slate-600"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">{match.score_team2}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default MatchScoreManager;
