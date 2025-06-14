import { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Settings, Trophy, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import TournamentEditDialog from "@/components/TournamentEditDialog";
import AutomatedScheduling from "@/components/AutomatedScheduling";
import ScoreReporting from "@/components/ScoreReporting";
import IntegratedBracketView from "@/components/IntegratedBracketView";
import TournamentParticipants from "@/components/TournamentParticipants";
import TournamentStatusManager from "@/components/TournamentStatusManager";
import TeamBalancingTool from "@/components/TeamBalancingTool";
import TeamBalancingInterface from "@/components/TeamBalancingInterface";
import BracketGenerator from "@/components/BracketGenerator";
import ComprehensiveTournamentEditor from "@/components/ComprehensiveTournamentEditor";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  check_in_starts_at: string | null;
  check_in_ends_at: string | null;
  max_teams: number;
  max_players: number;
  prize_pool: string | null;
  status: 'draft' | 'open' | 'balancing' | 'live' | 'completed' | 'archived' | null;
  match_format: string | null;
  bracket_type: string | null;
}

interface Match {
  id: string;
  match_number: number;
  round_number: number;
  team1_id: string | null;
  team2_id: string | null;
  score_team1: number | null;
  score_team2: number | null;
  status: string;
  winner_id: string | null;
  team1?: { name: string } | null;
  team2?: { name: string } | null;
  scheduled_time: string | null;
}

interface Team {
  id: string;
  name: string;
  seed: number | null;
  total_rank_points: number | null;
  status: string | null;
}

interface Participant {
  id: string;
  user_id: string | null;
  tournament_id: string | null;
  is_checked_in: boolean | null;
  users?: {
    discord_username: string | null;
  };
}

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTournament();
      fetchMatches();
      fetchTeams();
      fetchParticipants();
      if (user) {
        checkRegistrationStatus();
      }
    }
  }, [id, user]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        setIsAdmin(data?.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const fetchTournament = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error: any) {
      console.error('Error fetching tournament:', error);
      toast({
        title: "Error",
        description: "Failed to load tournament",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *, 
          team1:teams!matches_team1_id_fkey (name),
          team2:teams!matches_team2_id_fkey (name)
        `)
        .eq('tournament_id', id)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (error: any) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      });
    }
  };

  const fetchTeams = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', id);

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
    }
  };

  const fetchParticipants = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select(`
          id,
          user_id,
          tournament_id,
          is_checked_in,
          users:user_id (
            discord_username
          )
        `)
        .eq('tournament_id', id);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error: any) {
      console.error('Error fetching participants:', error);
      toast({
        title: "Error",
        description: "Failed to load participants",
        variant: "destructive",
      });
    }
  };

  const checkRegistrationStatus = async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from('tournament_signups')
        .select('id')
        .eq('tournament_id', id)
        .eq('user_id', user.id)
        .single();

      setIsRegistered(!!data);
    } catch (error) {
      setIsRegistered(false);
    }
  };

  const handleRegistration = async () => {
    if (!user || !id) return;

    try {
      if (isRegistered) {
        const { error } = await supabase
          .from('tournament_signups')
          .delete()
          .eq('tournament_id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsRegistered(false);
        toast({
          title: "Unregistered",
          description: "You have been removed from the tournament",
        });
      } else {
        const { error } = await supabase
          .from('tournament_signups')
          .insert({
            tournament_id: id,
            user_id: user.id,
          });

        if (error) throw error;
        setIsRegistered(true);
        toast({
          title: "Registered",
          description: "You have been registered for the tournament",
        });
      }
      fetchParticipants();
    } catch (error: any) {
      console.error('Error handling registration:', error);
      toast({
        title: "Error",
        description: "Failed to update registration",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'open' | 'balancing' | 'live' | 'completed' | 'archived') => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setTournament(prev => prev ? { ...prev, status: newStatus } : null);
      toast({
        title: "Tournament Updated",
        description: `Tournament status changed to ${newStatus}`,
      });
    } catch (error: any) {
      console.error('Error updating tournament status:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'open':
        return <Badge className="bg-green-600">Open for Registration</Badge>;
      case 'balancing':
        return <Badge className="bg-yellow-600">Balancing Teams</Badge>;
      case 'live':
        return <Badge className="bg-blue-600">Live</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600">Completed</Badge>;
      case 'archived':
        return <Badge className="bg-gray-800">Archived</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Loading tournament details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Tournament not found</p>
            <Button onClick={() => navigate('/tournaments')} className="mt-4 bg-red-600 hover:bg-red-700">
              Back to Tournaments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {tournament.name}
              </h1>
              <div className="flex items-center gap-2 text-slate-400">
                {getStatusBadge(tournament.status)}
                {tournament.start_time && (
                  <>
                    <Calendar className="w-4 h-4" />
                    {new Date(tournament.start_time).toLocaleDateString()}
                  </>
                )}
              </div>
            </div>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-slate-300 p-6">
              {tournament.description || 'No description provided.'}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {participants.length}/{tournament.max_players}
              </div>
              <div className="text-sm text-slate-400">
                Players registered
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Prize Pool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {tournament.prize_pool || 'TBD'}
              </div>
              <div className="text-sm text-slate-400">
                Total prizes
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {tournament.match_format || 'BO1'}
              </div>
              <div className="text-sm text-slate-400">
                Match format
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="bracket" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              Bracket
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              Participants
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {tournament.status === 'open' && user && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Tournament Registration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300">
                        {isRegistered ? 'You are registered for this tournament' : 'Register for this tournament'}
                      </p>
                      <p className="text-sm text-slate-400">
                        {participants.length} / {tournament.max_players} players registered
                      </p>
                    </div>
                    <Button
                      onClick={handleRegistration}
                      className={isRegistered ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                    >
                      {isRegistered ? 'Unregister' : 'Register'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Tournament Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-400">Start Time</div>
                    <div className="text-white">
                      {tournament.start_time ? new Date(tournament.start_time).toLocaleString() : 'TBD'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">End Time</div>
                    <div className="text-white">
                      {tournament.end_time ? new Date(tournament.end_time).toLocaleString() : 'TBD'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Registration Opens</div>
                    <div className="text-white">
                      {tournament.registration_opens_at ? new Date(tournament.registration_opens_at).toLocaleString() : 'TBD'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Registration Closes</div>
                    <div className="text-white">
                      {tournament.registration_closes_at ? new Date(tournament.registration_closes_at).toLocaleString() : 'TBD'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {matches.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Tournament Matches
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {matches.map((match) => (
                    <ScoreReporting
                      key={match.id}
                      match={match}
                      onScoreSubmitted={() => {
                        fetchMatches();
                        toast({
                          title: "Score Reported",
                          description: "Match score has been submitted",
                        });
                      }}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bracket">
            <IntegratedBracketView tournamentId={tournament.id} />
          </TabsContent>

          <TabsContent value="participants">
            <TournamentParticipants 
              tournamentId={tournament.id} 
              maxPlayers={tournament.max_players}
              isAdmin={isAdmin}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <ComprehensiveTournamentEditor
                tournament={tournament}
                onTournamentUpdated={fetchTournament}
              />

              <TournamentStatusManager
                tournamentId={tournament.id}
                currentStatus={tournament.status || 'draft'}
                onStatusChange={fetchTournament}
              />

              {(tournament.status === 'open' || tournament.status === 'balancing') && (
                <>
                  <TeamBalancingTool
                    tournamentId={tournament.id}
                    maxTeams={tournament.max_teams || 8}
                    onTeamsBalanced={() => {
                      fetchTeams();
                      fetchParticipants();
                      toast({
                        title: "Teams Balanced",
                        description: "Teams have been automatically balanced",
                      });
                    }}
                  />
                  
                  <TeamBalancingInterface tournamentId={tournament.id} />
                </>
              )}

              {tournament.status === 'balancing' && (
                <BracketGenerator
                  tournamentId={tournament.id}
                  tournament={{
                    status: tournament.status || 'draft',
                    max_teams: tournament.max_teams || 8,
                    bracket_type: tournament.bracket_type || 'single_elimination',
                    match_format: tournament.match_format || 'BO1'
                  }}
                  teams={teams}
                  onBracketGenerated={() => {
                    fetchMatches();
                    fetchTournament();
                    toast({
                      title: "Bracket Generated",
                      description: "Tournament bracket has been created",
                    });
                  }}
                />
              )}

              {tournament.status === 'live' && (
                <AutomatedScheduling
                  tournamentId={tournament.id}
                  onScheduleCreated={() => {
                    fetchMatches();
                    toast({
                      title: "Schedule Updated",
                      description: "Tournament schedule has been automatically generated",
                    });
                  }}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default TournamentDetail;
