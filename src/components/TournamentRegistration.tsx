
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TournamentRegistrationProps {
  tournamentId: string;
  tournament: {
    status: string;
    max_players: number;
    registration_opens_at: string;
    registration_closes_at: string;
  };
  onRegistrationChange: () => void;
}

const TournamentRegistration = ({ tournamentId, tournament, onRegistrationChange }: TournamentRegistrationProps) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkRegistrationStatus();
      fetchRegistrationCount();
    }
  }, [user, tournamentId]);

  const checkRegistrationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsRegistered(!!data);
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  const fetchRegistrationCount = async () => {
    try {
      const { count, error } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      if (error) throw error;
      setRegistrationCount(count || 0);
    } catch (error) {
      console.error('Error fetching registration count:', error);
    }
  };

  const handleRegistration = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register for tournaments",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isRegistered) {
        // Unregister
        const { error } = await supabase
          .from('tournament_signups')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsRegistered(false);
        setRegistrationCount(prev => prev - 1);
        toast({
          title: "Unregistered",
          description: "You have been removed from the tournament",
        });
      } else {
        // Register
        if (registrationCount >= tournament.max_players) {
          toast({
            title: "Tournament Full",
            description: "This tournament has reached maximum capacity",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase
          .from('tournament_signups')
          .insert({
            tournament_id: tournamentId,
            user_id: user.id,
            signed_up_at: new Date().toISOString()
          });

        if (error) throw error;

        setIsRegistered(true);
        setRegistrationCount(prev => prev + 1);
        toast({
          title: "Registered Successfully",
          description: "You have been registered for the tournament",
        });
      }

      onRegistrationChange();
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to update registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isRegistrationOpen = () => {
    const now = new Date();
    const opensAt = new Date(tournament.registration_opens_at);
    const closesAt = new Date(tournament.registration_closes_at);
    return now >= opensAt && now <= closesAt && tournament.status === 'open';
  };

  const getRegistrationStatus = () => {
    const now = new Date();
    const opensAt = new Date(tournament.registration_opens_at);
    const closesAt = new Date(tournament.registration_closes_at);

    if (now < opensAt) return 'not_open';
    if (now > closesAt) return 'closed';
    if (tournament.status !== 'open') return 'tournament_closed';
    return 'open';
  };

  const status = getRegistrationStatus();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Tournament Registration
          <Badge variant={isRegistered ? "default" : "outline"} className={isRegistered ? "bg-green-600" : ""}>
            {isRegistered ? "Registered" : "Not Registered"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4" />
            <span>Players: {registrationCount}/{tournament.max_players}</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">
              {status === 'not_open' && 'Registration opens soon'}
              {status === 'closed' && 'Registration closed'}
              {status === 'tournament_closed' && 'Tournament no longer accepting registrations'}
              {status === 'open' && 'Registration is open'}
            </div>
          </div>
        </div>

        {status === 'open' && (
          <Button
            onClick={handleRegistration}
            disabled={loading || (!isRegistered && registrationCount >= tournament.max_players)}
            className={isRegistered 
              ? "bg-red-600 hover:bg-red-700 text-white w-full" 
              : "bg-green-600 hover:bg-green-700 text-white w-full"
            }
          >
            {loading ? (
              "Processing..."
            ) : isRegistered ? (
              <>
                <UserMinus className="w-4 h-4 mr-2" />
                Unregister
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Join Tournament
              </>
            )}
          </Button>
        )}

        {status === 'not_open' && (
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span>Opens: {new Date(tournament.registration_opens_at).toLocaleDateString()}</span>
          </div>
        )}

        {status === 'closed' && (
          <div className="text-center text-slate-400">
            Registration has closed for this tournament
          </div>
        )}

        {status === 'tournament_closed' && (
          <div className="text-center text-slate-400">
            This tournament is no longer accepting registrations
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentRegistration;
