import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, Trophy, Info, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TournamentRegistration from "@/components/TournamentRegistration";
import TournamentParticipants from "@/components/TournamentParticipants";
import IntegratedBracketView from "@/components/IntegratedBracketView";
import TournamentManagement from "@/components/TournamentManagement";
import BracketGenerator from "@/components/BracketGenerator";

interface Tournament {
  id: string;
  name: string;
  description: string;
  bracket_type: string;
  match_format: string;
  max_teams: number;
  start_time: string;
  prize_pool: string;
  registration_opens_at: string;
  registration_closes_at: string;
  check_in_required: boolean;
  check_in_starts_at: string;
  check_in_ends_at: string;
  status: string;
  team_size: number;
}

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSignedUp, setIsSignedUp] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTournament(id);
      checkUserRegistration(id);
    }
  }, [id, user?.id]);

  const fetchTournament = async (id: string) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      setTournament(data);
    } catch (error: any) {
      console.error('Error fetching tournament:', error);
      setError('Tournament not found');
    } finally {
      setLoading(false);
    }
  };

  const checkUserRegistration = async (tournamentId: string) => {
    if (!user?.id) {
      setIsSignedUp(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        setIsSignedUp(false);
      } else {
        setIsSignedUp(!!data);
      }
    } catch (error) {
      console.error('Error checking registration:', error);
      setIsSignedUp(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-white">Loading tournament...</div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Tournament Not Found</h1>
          <p className="text-slate-400 mb-4">{error || 'The tournament you are looking for does not exist.'}</p>
          <Button onClick={() => navigate('/tournaments')} className="bg-blue-600 hover:bg-blue-700">
            Back to Tournaments
          </Button>
        </div>
      </div>
    );
  }

  const isRegistrationOpen = tournament.status === 'open' && 
    (!tournament.registration_closes_at || new Date() < new Date(tournament.registration_closes_at));

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Tournament Header */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{tournament.name}</h1>
            <p className="text-slate-300 mb-4">{tournament.description}</p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-blue-600 text-white">
                {tournament.bracket_type.replace('_', ' ')}
              </Badge>
              <Badge className="bg-green-600 text-white">
                {tournament.match_format}
              </Badge>
              <Badge className="bg-purple-600 text-white">
                Max {tournament.max_teams} Teams
              </Badge>
              {tournament.team_size && (
                <Badge className="bg-orange-600 text-white">
                  {tournament.team_size}v{tournament.team_size}
                </Badge>
              )}
              <Badge className={
                tournament.status === 'open' ? "bg-green-600 text-white" :
                tournament.status === 'live' ? "bg-red-600 text-white" :
                tournament.status === 'completed' ? "bg-gray-600 text-white" :
                "bg-yellow-600 text-white"
              }>
                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
              </Badge>
            </div>
          </div>

          <div className="text-right">
            {tournament.start_time && (
              <div className="text-slate-300 mb-2">
                <Clock className="inline w-4 h-4 mr-2" />
                {new Date(tournament.start_time).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
            {tournament.prize_pool && (
              <div className="text-yellow-400 font-semibold">
                <Trophy className="inline w-4 h-4 mr-2" />
                Prize: {tournament.prize_pool}
              </div>
            )}
          </div>
        </div>

        {/* Registration Button */}
        {isRegistrationOpen && !isSignedUp && (
          <div className="mt-6 pt-4 border-t border-slate-700">
            <TournamentRegistration 
              tournamentId={tournament.id} 
              onRegistrationChange={checkUserRegistration}
            />
          </div>
        )}

        {isSignedUp && tournament.status === 'open' && (
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">You are registered for this tournament</span>
            </div>
          </div>
        )}
      </div>

      {/* Tournament Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
          <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="participants" className="text-slate-300 data-[state=active]:text-white">
            Participants
          </TabsTrigger>
          <TabsTrigger value="bracket" className="text-slate-300 data-[state=active]:text-white">
            Bracket
          </TabsTrigger>
          {(user?.role === 'admin' || user?.role === 'moderator') && (
            <TabsTrigger value="management" className="text-slate-300 data-[state=active]:text-white">
              Management
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Tournament Details */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Info className="w-5 h-5" />
                Tournament Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-sm">Tournament Format</label>
                  <p className="text-white font-medium">{tournament.bracket_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Match Format</label>
                  <p className="text-white font-medium">{tournament.match_format}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Team Size</label>
                  <p className="text-white font-medium">
                    {tournament.team_size ? `${tournament.team_size}v${tournament.team_size}` : '5v5 (Default)'}
                  </p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Maximum Teams</label>
                  <p className="text-white font-medium">{tournament.max_teams}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-sm">Registration Opens</label>
                  <p className="text-white font-medium">
                    {tournament.registration_opens_at 
                      ? new Date(tournament.registration_opens_at).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Open Now'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Registration Closes</label>
                  <p className="text-white font-medium">
                    {tournament.registration_closes_at 
                      ? new Date(tournament.registration_closes_at).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Until Tournament Starts'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Check-in Required</label>
                  <p className="text-white font-medium">
                    {tournament.check_in_required ? 'Yes' : 'No'}
                  </p>
                </div>
                {tournament.check_in_required && (
                  <div>
                    <label className="text-slate-400 text-sm">Check-in Period</label>
                    <p className="text-white font-medium">
                      {tournament.check_in_starts_at && tournament.check_in_ends_at
                        ? `${new Date(tournament.check_in_starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${new Date(tournament.check_in_ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                        : 'TBD'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <TournamentParticipants tournamentId={tournament.id} />
        </TabsContent>

        <TabsContent value="bracket">
          {tournament.status === 'draft' ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-8 text-center">
                <Trophy className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-400 text-lg mb-2">Tournament bracket not available</p>
                <p className="text-slate-500">
                  The bracket will be generated once the tournament begins.
                </p>
              </CardContent>
            </Card>
          ) : (
            <IntegratedBracketView tournamentId={tournament.id} />
          )}
        </TabsContent>

        {(user?.role === 'admin' || user?.role === 'moderator') && (
          <TabsContent value="management">
            <div className="space-y-6">
              <TournamentManagement tournament={tournament} />
              
              {tournament.status !== 'draft' && (
                <BracketGenerator 
                  tournamentId={tournament.id}
                  maxTeams={tournament.max_teams}
                  bracketType={tournament.bracket_type}
                  onBracketGenerated={() => {
                    // Refresh tournament data
                    fetchTournament(tournament.id);
                  }}
                />
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default TournamentDetail;
