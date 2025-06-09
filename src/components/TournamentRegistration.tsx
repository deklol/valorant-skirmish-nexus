
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus, Clock, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CheckInEnforcement from "./CheckInEnforcement";

interface TournamentRegistrationProps {
  tournamentId: string;
  tournament: {
    name: string;
    status: string;
    max_players: number;
    registration_opens_at: string;
    registration_closes_at: string;
    check_in_starts_at: string;
    check_in_ends_at: string;
    check_in_required: boolean;
  };
  onRegistrationChange: () => void;
}

const TournamentRegistration = ({ tournamentId, tournament, onRegistrationChange }: TournamentRegistrationProps) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
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
        .select('id, is_checked_in')
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
      const { count: totalCount, error: totalError } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      const { count: checkedInCountData, error: checkedInError } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('is_checked_in', true);

      if (totalError) throw totalError;
      if (checkedInError) throw checkedInError;

      setRegistrationCount(totalCount || 0);
      setCheckedInCount(checkedInCountData || 0);
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
        // Check if tournament is full
        if (registrationCount >= tournament.max_players) {
          toast({
            title: "Tournament Full",
            description: "This tournament has reached maximum capacity",
            variant: "destructive",
          });
          return;
        }

        // Register
        const { error } = await supabase
          .from('tournament_signups')
          .insert({
            tournament_id: tournamentId,
            user_id: user.id,
            signed_up_at: new Date().toISOString(),
            is_checked_in: false
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
    <div className="space-y-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-slate-300">
              <Users className="w-4 h-4" />
              <span>Registered: {registrationCount}/{tournament.max_players}</span>
            </div>
            {tournament.check_in_required && (
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4" />
                <span>Checked In: {checkedInCount}/{registrationCount}</span>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-400">
              {status === 'not_open' && 'Registration opens soon'}
              {status === 'closed' && 'Registration closed'}
              {status === 'tournament_closed' && 'Tournament no longer accepting registrations'}
              {status === 'open' && 'Registration is open'}
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

          {registrationCount >= tournament.max_players && status === 'open' && !isRegistered && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Tournament is full</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in component for registered users */}
      {isRegistered && tournament.check_in_required && (
        <CheckInEnforcement
          tournamentId={tournamentId}
          tournamentName={tournament.name}
          checkInStartTime={tournament.check_in_starts_at}
          checkInEndTime={tournament.check_in_ends_at}
          checkInRequired={tournament.check_in_required}
          onCheckInChange={fetchRegistrationCount}
        />
      )}
    </div>
  );
};

export default TournamentRegistration;
