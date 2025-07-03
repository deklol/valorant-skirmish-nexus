
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus, Clock, Users, AlertTriangle, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CheckInEnforcement from "./CheckInEnforcement";
import ErrorBoundary from "./ErrorBoundary";

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
  const [isSubstitute, setIsSubstitute] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [substituteCount, setSubstituteCount] = useState(0);
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
        .select('id, is_checked_in, is_substitute')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsRegistered(!!data);
      setIsSubstitute(data?.is_substitute || false);
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  const fetchRegistrationCount = async () => {
    try {
      const { count: totalCount, error: totalError } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('is_substitute', false);

      const { count: substituteCountData, error: substituteError } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('is_substitute', true);

      const { count: checkedInCountData, error: checkedInError } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('is_checked_in', true);

      if (totalError) throw totalError;
      if (substituteError) throw substituteError;
      if (checkedInError) throw checkedInError;

      setRegistrationCount(totalCount || 0);
      setSubstituteCount(substituteCountData || 0);
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
        setIsSubstitute(false);
        if (!isSubstitute) {
          setRegistrationCount(prev => prev - 1);
        } else {
          setSubstituteCount(prev => prev - 1);
        }
        toast({
          title: "Unregistered",
          description: `You have been removed from the tournament ${isSubstitute ? 'substitute list' : ''}`,
        });
      } else {
        // Check if tournament is full - if so, register as substitute
        const isFull = registrationCount >= tournament.max_players;
        
        // Register as main player or substitute
        const { error } = await supabase
          .from('tournament_signups')
          .insert({
            tournament_id: tournamentId,
            user_id: user.id,
            signed_up_at: new Date().toISOString(),
            is_checked_in: false,
            is_substitute: isFull,
            priority: isFull ? 0 : undefined, // Default priority for substitutes
            available: true
          });

        if (error) throw error;

        setIsRegistered(true);
        setIsSubstitute(isFull);
        
        // Refresh rank after successful signup (non-blocking)
        refreshPlayerRank();
        
        if (isFull) {
          setSubstituteCount(prev => prev + 1);
          toast({
            title: "Added to Substitute List",
            description: "Tournament is full, but you've been added to the substitute list. You'll be notified if a spot opens up.",
          });
        } else {
          setRegistrationCount(prev => prev + 1);
          toast({
            title: "Registered Successfully",
            description: "You have been registered for the tournament",
          });
        }
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

  // Non-blocking rank refresh function
  const refreshPlayerRank = async () => {
    if (!user?.id) {
      console.log('No user ID found, skipping rank refresh');
      return;
    }

    try {
      // Get user's riot_id from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('riot_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.riot_id) {
        console.log('No Riot ID found for user, skipping rank refresh');
        return;
      }

      console.log('Refreshing rank for user after tournament signup...');
      
      const { data, error } = await supabase.functions.invoke('scrape-rank', {
        body: { 
          riot_id: userData.riot_id, 
          user_id: user.id 
        }
      });

      if (error) {
        console.warn('Rank refresh failed (non-critical):', error);
        return;
      }

      if (data?.success) {
        console.log('Rank successfully updated:', data);
        
        // Show success toast for rank update
        toast({
          title: "Rank Updated",
          description: `Your rank has been refreshed to ${data.current_rank}`,
          duration: 3000,
        });
      }
    } catch (error) {
      // Log but don't show error to user since this is a background enhancement
      console.warn('Background rank refresh failed:', error);
    }
  };

  const isRegistrationOpen = () => {
    const now = new Date();
    const opensAt = new Date(tournament.registration_opens_at);
    const closesAt = new Date(tournament.registration_closes_at);
    return now >= opensAt && now <= closesAt && tournament.status === 'open';
  };

  const getRegistrationStatus = () => {
    // If tournament status is not 'open', registration is closed
    if (tournament.status !== 'open') return 'tournament_closed';
    
    // If tournament status is 'open', registration is available
    // Only check close time to prevent registration after tournament ends
    const now = new Date();
    const closesAt = new Date(tournament.registration_closes_at);
    
    if (now > closesAt) return 'closed';
    return 'open';
  };

  const status = getRegistrationStatus();

  return (
    <ErrorBoundary componentName="TournamentRegistration">
      <div className="space-y-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              Tournament Registration
              <div className="flex items-center gap-2">
                <Badge variant={isRegistered ? "default" : "outline"} className={
                  isRegistered 
                    ? isSubstitute 
                      ? "bg-yellow-600" 
                      : "bg-green-600"
                    : ""
                }>
                  {isRegistered 
                    ? isSubstitute 
                      ? "On Substitute List" 
                      : "Registered"
                    : "Not Registered"
                  }
                </Badge>
                {isSubstitute && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40">
                    <Star className="w-3 h-3 mr-1" />
                    Substitute
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-4 h-4" />
                <span>Registered: {registrationCount}/{tournament.max_players}</span>
              </div>
              
              {substituteCount > 0 && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Star className="w-4 h-4" />
                  <span>Substitutes: {substituteCount}</span>
                </div>
              )}
              
              {tournament.check_in_required && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4" />
                  <span>Checked In: {checkedInCount}/{registrationCount}</span>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-sm text-slate-400">
                {status === 'closed' && 'Registration closed'}
                {status === 'tournament_closed' && 'Tournament no longer accepting registrations'}
                {status === 'open' && registrationCount >= tournament.max_players && 'Tournament full - joining substitute list'}
                {status === 'open' && registrationCount < tournament.max_players && 'Registration is open'}
              </div>
            </div>

            {status === 'open' && (
              <Button
                onClick={handleRegistration}
                disabled={loading}
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
                    {isSubstitute ? 'Leave Substitute List' : 'Unregister'}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {registrationCount >= tournament.max_players ? 'Join Substitute List' : 'Join Tournament'}
                  </>
                )}
              </Button>
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
                <Star className="w-4 h-4" />
                <span>Tournament is full - you can join the substitute list</span>
              </div>
            )}

            {isSubstitute && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">Substitute Player</span>
                </div>
                <p className="text-slate-300 text-sm mt-1">
                  You're on the substitute list. If a spot opens up, you'll be automatically promoted 
                  and notified. Keep an eye on your notifications!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-in component for registered users */}
        {isRegistered && !isSubstitute && tournament.check_in_required && (
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
    </ErrorBoundary>
  );
};

export default TournamentRegistration;
