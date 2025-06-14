
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Users, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Participant {
  id: string;
  user_id: string;
  is_checked_in: boolean;
  users: {
    discord_username: string;
    riot_id: string;
    current_rank: string;
  } | null;
}

interface ForceCheckInManagerProps {
  tournamentId: string;
  onCheckInUpdate: () => void;
}

const ForceCheckInManager = ({ tournamentId, onCheckInUpdate }: ForceCheckInManagerProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processingAll, setProcessingAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipants();
  }, [tournamentId]);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select(`
          id,
          user_id,
          is_checked_in,
          users:user_id (
            discord_username,
            riot_id,
            current_rank
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('is_substitute', false)
        .order('is_checked_in', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
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

  const forceCheckIn = async (participantId: string) => {
    setProcessingIds(prev => new Set([...prev, participantId]));
    
    try {
      const { error } = await supabase
        .from('tournament_signups')
        .update({
          is_checked_in: true,
          checked_in_at: new Date().toISOString()
        })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: "Player Checked In",
        description: "Player has been force checked in",
      });

      fetchParticipants();
      onCheckInUpdate();
    } catch (error) {
      console.error('Error force checking in player:', error);
      toast({
        title: "Error",
        description: "Failed to check in player",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(participantId);
        return newSet;
      });
    }
  };

  const forceCheckInAll = async () => {
    const uncheckedParticipants = participants.filter(p => !p.is_checked_in);
    
    if (uncheckedParticipants.length === 0) {
      toast({
        title: "All Checked In",
        description: "All participants are already checked in",
      });
      return;
    }

    setProcessingAll(true);
    
    try {
      const { error } = await supabase
        .from('tournament_signups')
        .update({
          is_checked_in: true,
          checked_in_at: new Date().toISOString()
        })
        .eq('tournament_id', tournamentId)
        .eq('is_substitute', false)
        .eq('is_checked_in', false);

      if (error) throw error;

      toast({
        title: "All Players Checked In",
        description: `${uncheckedParticipants.length} players have been force checked in`,
      });

      fetchParticipants();
      onCheckInUpdate();
    } catch (error) {
      console.error('Error force checking in all players:', error);
      toast({
        title: "Error",
        description: "Failed to check in all players",
        variant: "destructive",
      });
    } finally {
      setProcessingAll(false);
    }
  };

  if (loading) {
    return <div className="text-center text-white">Loading participants...</div>;
  }

  const checkedInCount = participants.filter(p => p.is_checked_in).length;
  const totalCount = participants.length;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Force Check-In Manager
        </CardTitle>
        <div className="text-slate-300">
          {checkedInCount}/{totalCount} players checked in
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-slate-300">
            Force check-in players who haven't checked in yet
          </div>
          <Button
            onClick={forceCheckInAll}
            disabled={processingAll || checkedInCount === totalCount}
            className="bg-green-600 hover:bg-green-700"
          >
            <Users className="w-4 h-4 mr-2" />
            {processingAll ? "Processing..." : "Check In All"}
          </Button>
        </div>

        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="bg-slate-700 p-3 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-white font-medium">
                    {participant.users?.discord_username || 'Unknown Player'}
                  </div>
                  <div className="text-slate-400 text-sm">
                    {participant.users?.riot_id || 'No Riot ID'} • {participant.users?.current_rank || 'Unranked'}
                  </div>
                </div>
                {participant.is_checked_in && (
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Checked In
                  </Badge>
                )}
              </div>
              
              {!participant.is_checked_in && (
                <Button
                  size="sm"
                  onClick={() => forceCheckIn(participant.id)}
                  disabled={processingIds.has(participant.id)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserCheck className="w-3 h-3 mr-1" />
                  {processingIds.has(participant.id) ? "Processing..." : "Force Check In"}
                </Button>
              )}
            </div>
          ))}
        </div>

        {participants.length === 0 && (
          <div className="text-center text-slate-400 py-4">
            No participants found for this tournament
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ForceCheckInManager;
