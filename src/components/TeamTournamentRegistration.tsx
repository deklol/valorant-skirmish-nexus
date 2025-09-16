import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserTeam } from "@/hooks/useUserTeam";
import ErrorBoundary from "./ErrorBoundary";

interface TeamTournamentRegistrationProps {
  tournamentId: string;
  tournament: {
    name: string;
    status: string;
    max_teams: number;
    team_size: number;
    registration_opens_at: string;
    registration_closes_at: string;
    registration_type: "solo" | "team";
  };
  onRegistrationChange: () => void;
}

const TeamTournamentRegistration = ({ 
  tournamentId, 
  tournament, 
  onRegistrationChange 
}: TeamTournamentRegistrationProps) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { userTeam, loading: teamLoading } = useUserTeam(user?.id);
  const { toast } = useToast();

  useEffect(() => {
    fetchRegistrationCount();
    if (user && userTeam) {
      checkRegistrationStatus();
    }
  }, [user, userTeam, tournamentId]);

  const checkRegistrationStatus = async () => {
    if (!user || !userTeam) return;

    try {
      const { data, error } = await supabase
        .from('team_tournament_registrations')
        .select('id, status')
        .eq('tournament_id', tournamentId)
        .eq('team_id', userTeam.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsRegistered(!!data && data.status === 'registered');
    } catch (error) {
      console.error('Error checking team registration:', error);
    }
  };

  const fetchRegistrationCount = async () => {
    try {
      const { count, error } = await supabase
        .from('team_tournament_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('status', 'registered');

      if (error) throw error;
      setRegistrationCount(count || 0);
    } catch (error) {
      console.error('Error fetching registration count:', error);
    }
  };

  const handleTeamRegistration = async () => {
    if (!user || !userTeam) {
      toast({
        title: "Team Required",
        description: "You must be part of a team to register for team tournaments",
        variant: "destructive",
      });
      return;
    }

    // Check if user is team captain
    if (userTeam.captain_id !== user.id) {
      toast({
        title: "Captain Only",
        description: "Only the team captain can register the team for tournaments",
        variant: "destructive",
      });
      return;
    }

    // Validate team size
    if (userTeam.member_count < tournament.team_size) {
      toast({
        title: "Team Too Small",
        description: `Your team needs ${tournament.team_size} members to register for this tournament`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isRegistered) {
        // Unregister team
        const { error } = await supabase
          .from('team_tournament_registrations')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('team_id', userTeam.id);

        if (error) throw error;

        setIsRegistered(false);
        setRegistrationCount(prev => prev - 1);
        toast({
          title: "Team Withdrawn",
          description: `${userTeam.name} has been withdrawn from the tournament`,
        });
      } else {
        // Register team
        const { error } = await supabase
          .from('team_tournament_registrations')
          .insert({
            tournament_id: tournamentId,
            team_id: userTeam.id,
            status: 'registered'
          });

        if (error) throw error;

        setIsRegistered(true);
        setRegistrationCount(prev => prev + 1);
        toast({
          title: "Team Registered",
          description: `${userTeam.name} has been registered for the tournament`,
        });
      }

      onRegistrationChange();
    } catch (error: any) {
      console.error('Team registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to update team registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRegistrationStatus = () => {
    if (tournament.status !== 'open') return 'tournament_closed';
    
    const now = new Date();
    const closesAt = new Date(tournament.registration_closes_at);
    
    if (now > closesAt) return 'closed';
    return 'open';
  };

  const canRegister = () => {
    if (!user || !userTeam || teamLoading) return false;
    if (userTeam.captain_id !== user.id) return false;
    if (userTeam.member_count < tournament.team_size) return false;
    if (getRegistrationStatus() !== 'open') return false;
    return true;
  };

  const getRegistrationMessage = () => {
    if (!user) return "Please log in to register your team";
    if (teamLoading) return "Loading team information...";
    if (!userTeam) return "You need to be part of a team to register";
    if (userTeam.captain_id !== user.id) return "Only team captains can register their team";
    if (userTeam.member_count < tournament.team_size) return `Team needs ${tournament.team_size} members (currently ${userTeam.member_count})`;
    if (getRegistrationStatus() === 'closed') return "Registration has closed";
    if (getRegistrationStatus() === 'tournament_closed') return "Tournament no longer accepting registrations";
    if (registrationCount >= tournament.max_teams) return "Tournament is full";
    return "Ready to register";
  };

  const status = getRegistrationStatus();

  return (
    <ErrorBoundary componentName="TeamTournamentRegistration">
      <div className="space-y-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left Side - Registration Info */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">Team Tournament Registration</h3>
                  <Badge variant={isRegistered ? "default" : "outline"} className={
                    isRegistered ? "bg-green-600" : ""
                  }>
                    {isRegistered ? "Team Registered" : "Team Not Registered"}
                  </Badge>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40">
                    <Shield className="w-3 h-3 mr-1" />
                    Team Tournament
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{registrationCount}/{tournament.max_teams} Teams</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    <span>{tournament.team_size} players per team</span>
                  </div>
                </div>
              </div>

              {/* Right Side - Action Button */}
              <div className="flex flex-col items-end gap-2">
                <div className="text-sm text-slate-400 text-right">
                  {getRegistrationMessage()}
                </div>
                
                {status === 'open' && canRegister() && (
                  <Button
                    onClick={handleTeamRegistration}
                    disabled={loading || registrationCount >= tournament.max_teams}
                    className={isRegistered 
                      ? "bg-red-600 hover:bg-red-700 text-white" 
                      : "bg-green-600 hover:bg-green-700 text-white"
                    }
                  >
                    {loading ? (
                      "Processing..."
                    ) : isRegistered ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Withdraw Team
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Register Team
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Team Information Display */}
            {userTeam && (
              <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white">Your Team: {userTeam.name}</h4>
                  {userTeam.captain_id === user?.id && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
                      Captain
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-slate-300">
                  <p>Members: {userTeam.member_count}/{tournament.team_size}</p>
                  {userTeam.member_count < tournament.team_size && (
                    <div className="flex items-center gap-2 text-yellow-400 mt-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Team needs more members to register</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No Team Warning */}
            {!teamLoading && !userTeam && user && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">No Team Found</span>
                </div>
                <p className="text-slate-300 text-sm mt-1">
                  You need to be part of a team to register for team tournaments. 
                  Create or join a team to participate.
                </p>
              </div>
            )}

            {/* Tournament Full Warning */}
            {registrationCount >= tournament.max_teams && status === 'open' && !isRegistered && (
              <div className="flex items-center gap-2 text-red-400 text-sm mt-3 pt-3 border-t border-slate-700">
                <XCircle className="w-4 h-4" />
                <span>Tournament is full - no more teams can register</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default TeamTournamentRegistration;