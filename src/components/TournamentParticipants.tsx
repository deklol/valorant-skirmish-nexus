
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Crown, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ClickableUsername from "./ClickableUsername";
import { getRankIcon, getRankColor } from "@/utils/rankUtils";

interface Participant {
  id: string;
  user_id: string;
  is_checked_in: boolean;
  is_substitute: boolean;
  signed_up_at: string;
  checked_in_at: string | null;
  users: {
    discord_username: string;
    riot_id: string;
    current_rank: string;
  };
}

interface TournamentParticipantsProps {
  tournamentId: string;
  maxPlayers: number;
  isAdmin?: boolean;
}

const TournamentParticipants = ({ tournamentId, maxPlayers, isAdmin = false }: TournamentParticipantsProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [substitutes, setSubstitutes] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipants();
  }, [tournamentId]);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select(`
          *,
          users:user_id (
            discord_username,
            riot_id,
            current_rank
          )
        `)
        .eq('tournament_id', tournamentId)
        .order('signed_up_at');

      if (error) throw error;

      const mainParticipants = data?.filter(p => !p.is_substitute) || [];
      const subParticipants = data?.filter(p => p.is_substitute) || [];
      
      setParticipants(mainParticipants);
      setSubstitutes(subParticipants);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: "Error",
        description: "Failed to load participants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const promoteSubstitute = async (substituteId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_signups')
        .update({ is_substitute: false })
        .eq('id', substituteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Substitute promoted to main participant",
      });
      
      fetchParticipants();
    } catch (error) {
      console.error('Error promoting substitute:', error);
      toast({
        title: "Error",
        description: "Failed to promote substitute",
        variant: "destructive",
      });
    }
  };

  const removeParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_signups')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Participant removed from tournament",
      });
      
      fetchParticipants();
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: "Error",
        description: "Failed to remove participant",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center text-white">Loading participants...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Participants */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Main Participants ({participants.length}/{maxPlayers})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant) => (
              <div key={participant.id} className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white font-medium">
                      <ClickableUsername 
                        userId={participant.user_id}
                        username={participant.users?.discord_username || 'Unknown'}
                      />
                    </div>
                    <div className="text-slate-400 text-sm">
                      {participant.users?.riot_id || 'No Riot ID'}
                    </div>
                        <div className="text-slate-400 text-sm">
                          <div className="flex items-center gap-1">
                            {getRankIcon(participant.users?.current_rank)}
                            <span className={getRankColor(participant.users?.current_rank)}>
                              {participant.users?.current_rank || 'Unranked'}
                            </span>
                          </div>
                        </div>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      onClick={() => removeParticipant(participant.id)}
                    >
                      <UserMinus className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {participant.is_checked_in && (
                    <Badge className="bg-green-500/20 text-green-400">
                      Checked In
                    </Badge>
                  )}
                  <div className="text-xs text-slate-500">
                    Joined: {new Date(participant.signed_up_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Substitutes */}
      {substitutes.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Substitutes ({substitutes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {substitutes.map((substitute) => (
                <div key={substitute.id} className="bg-slate-700 p-4 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-white font-medium">
                        <ClickableUsername 
                          userId={substitute.user_id}
                          username={substitute.users?.discord_username || 'Unknown'}
                        />
                      </div>
                      <div className="text-slate-400 text-sm">
                        {substitute.users?.riot_id || 'No Riot ID'}
                      </div>
                        <div className="text-slate-400 text-sm">
                          <div className="flex items-center gap-1">
                            {getRankIcon(substitute.users?.current_rank)}
                            <span className={getRankColor(substitute.users?.current_rank)}>
                              {substitute.users?.current_rank || 'Unranked'}
                            </span>
                          </div>
                        </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                          onClick={() => promoteSubstitute(substitute.id)}
                        >
                          <Crown className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={() => removeParticipant(substitute.id)}
                        >
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      Substitute
                    </Badge>
                    <div className="text-xs text-slate-500">
                      Joined: {new Date(substitute.signed_up_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TournamentParticipants;
