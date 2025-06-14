
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Trophy, MapPin, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TournamentRegistration from "@/components/TournamentRegistration";
import BracketGenerator from "@/components/BracketGenerator";
import IntegratedBracketView from "@/components/IntegratedBracketView";
import TournamentParticipants from "@/components/TournamentParticipants";
import TournamentManagement from "@/components/TournamentManagement";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  start_time: string | null;
  status: string;
  max_teams: number;
  max_players: number;
  bracket_type: string;
  match_format: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  check_in_required: boolean;
  check_in_starts_at: string | null;
  check_in_ends_at: string | null;
  prize_pool: string | null;
  created_by: string | null;
  team_size: number;
}

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupCount, setSignupCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [teamCount, setTeamCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchTournament();
      fetchSignupStats();
      if (user) {
        checkRegistrationStatus();
      }
    }
  }, [id, user]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast({
        title: "Error",
        description: "Failed to load tournament details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSignupStats = async () => {
    try {
      const { count: totalSignups } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', id);

      const { count: checkedIn } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', id)
        .eq('is_checked_in', true);

      const { count: teams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', id);

      setSignupCount(totalSignups || 0);
      setCheckedInCount(checkedIn || 0);
      setTeamCount(teams || 0);
    } catch (error) {
      console.error('Error fetching signup stats:', error);
    }
  };

  const checkRegistrationStatus = async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from('tournament_signups')
        .select('is_checked_in')
        .eq('tournament_id', id)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setIsRegistered(true);
        setIsCheckedIn(data.is_checked_in);
      }
    } catch (error) {
      // User is not registered
      setIsRegistered(false);
      setIsCheckedIn(false);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'published': return 'bg-blue-500';
      case 'live': return 'bg-green-500';
      case 'completed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-slate-400">Loading tournament details...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Tournament Not Found</h1>
          <p className="text-slate-400">The tournament you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isCreator = user?.id === tournament.created_by;
  const canManage = isAdmin || isCreator;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Tournament Header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                {tournament.name}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                  {tournament.status.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300">
                  {tournament.bracket_type.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300">
                  {tournament.match_format}
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300">
                  {tournament.team_size}v{tournament.team_size}
                </Badge>
              </div>
            </div>
            
            {/* Registration/Check-in Status */}
            {user && tournament.status === 'published' && (
              <div className="flex flex-col gap-2">
                {isRegistered ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-400">
                      {isCheckedIn ? 'Checked In' : 'Registered'}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tournament.description && (
            <p className="text-slate-300 mb-4">{tournament.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-5 h-5" />
              <div>
                <p className="text-sm">Start Time</p>
                <p className="text-white">{formatDateTime(tournament.start_time)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-5 h-5" />
              <div>
                <p className="text-sm">Participants</p>
                <p className="text-white">{signupCount}/{tournament.max_players}</p>
              </div>
            </div>
            
            {tournament.check_in_required && (
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="text-sm">Checked In</p>
                  <p className="text-white">{checkedInCount}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-slate-400">
              <Trophy className="w-5 h-5" />
              <div>
                <p className="text-sm">Teams</p>
                <p className="text-white">{teamCount}/{tournament.max_teams}</p>
              </div>
            </div>
            
            {tournament.prize_pool && (
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-5 h-5" />
                <div>
                  <p className="text-sm">Prize Pool</p>
                  <p className="text-white">{tournament.prize_pool}</p>
                </div>
              </div>
            )}
            
            {tournament.check_in_required && (
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-5 h-5" />
                <div>
                  <p className="text-sm">Check-in Period</p>
                  <p className="text-white text-xs">
                    {formatDateTime(tournament.check_in_starts_at)} - {formatDateTime(tournament.check_in_ends_at)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tournament Registration */}
      {tournament.status === 'published' && (
        <TournamentRegistration
          tournamentId={tournament.id}
          maxPlayers={tournament.max_players}
          currentPlayers={signupCount}
          registrationOpensAt={tournament.registration_opens_at}
          registrationClosesAt={tournament.registration_closes_at}
          checkInRequired={tournament.check_in_required}
          checkInStartsAt={tournament.check_in_starts_at}
          checkInEndsAt={tournament.check_in_ends_at}
          isRegistered={isRegistered}
          isCheckedIn={isCheckedIn}
          onRegistrationChange={() => {
            fetchSignupStats();
            checkRegistrationStatus();
          }}
        />
      )}

      {/* Tournament Management (Admin/Creator Only) */}
      {canManage && (
        <TournamentManagement 
          tournamentId={tournament.id}
          tournamentStatus={tournament.status}
          maxTeams={tournament.max_teams}
          teamSize={tournament.team_size}
          onTournamentUpdate={fetchTournament}
        />
      )}

      {/* Bracket Generator (Admin/Creator Only) */}
      {canManage && ['published', 'live'].includes(tournament.status) && (
        <BracketGenerator
          tournamentId={tournament.id}
          maxTeams={tournament.max_teams}
          bracketType={tournament.bracket_type}
          matchFormat={tournament.match_format}
        />
      )}

      {/* Tournament Bracket */}
      <IntegratedBracketView tournamentId={tournament.id} />

      {/* Tournament Participants */}
      <TournamentParticipants 
        tournamentId={tournament.id}
        showAdminControls={canManage}
      />
    </div>
  );
};

export default TournamentDetail;
