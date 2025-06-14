
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Trophy, Settings, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import TournamentRegistration from "@/components/TournamentRegistration";
import TournamentParticipants from "@/components/TournamentParticipants";
import BracketGenerator from "@/components/BracketGenerator";
import IntegratedBracketView from "@/components/IntegratedBracketView";
import MatchManager from "@/components/MatchManager";
import ComprehensiveTournamentEditor from "@/components/ComprehensiveTournamentEditor";
import TeamBalancingInterface from "@/components/TeamBalancingInterface";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  max_teams: number;
  max_players: number;
  team_size: number;
  bracket_type: string;
  match_format: string;
  final_match_format?: string;
  semifinal_match_format?: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  check_in_required: boolean;
  check_in_starts_at: string | null;
  check_in_ends_at: string | null;
  prize_pool: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  enable_map_veto: boolean;
  map_veto_required_rounds?: number[];
}

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      fetchTournament();
      fetchRegistrationData();
    }
  }, [id, user]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error('Tournament not found');
      }

      setTournament(data);
    } catch (error: any) {
      console.error('Error fetching tournament:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationData = async () => {
    if (!id) return;

    try {
      // Get registration counts
      const { data: signups, error: signupsError } = await supabase
        .from('tournament_signups')
        .select('is_checked_in')
        .eq('tournament_id', id);

      if (signupsError) throw signupsError;

      setRegistrationCount(signups?.length || 0);
      setCheckedInCount(signups?.filter(s => s.is_checked_in)?.length || 0);

      // Check if current user is registered
      if (user) {
        const { data: userSignup } = await supabase
          .from('tournament_signups')
          .select('id')
          .eq('tournament_id', id)
          .eq('user_id', user.id)
          .single();

        setIsRegistered(!!userSignup);
      }

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (
            user_id,
            is_captain,
            users (discord_username, current_rank)
          )
        `)
        .eq('tournament_id', id);

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

    } catch (error: any) {
      console.error('Error fetching registration data:', error);
    }
  };

  const handleRegistrationUpdate = () => {
    fetchRegistrationData();
  };

  const handleTournamentUpdate = () => {
    fetchTournament();
    fetchRegistrationData();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-gray-500/20 text-gray-400",
      published: "bg-blue-500/20 text-blue-400",
      balancing: "bg-orange-500/20 text-orange-400",
      live: "bg-green-500/20 text-green-400",
      completed: "bg-purple-500/20 text-purple-400"
    };

    return (
      <Badge className={variants[status] || variants.draft}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Loading tournament...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Tournament Not Found</h2>
              <p className="text-slate-400 mb-4">{error || "The tournament you're looking for doesn't exist."}</p>
              <Button onClick={() => navigate('/tournaments')} className="bg-red-600 hover:bg-red-700">
                Back to Tournaments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <CardTitle className="text-2xl text-white flex items-center gap-3">
                  <Trophy className="w-6 h-6" />
                  {tournament.name}
                </CardTitle>
                <div className="flex items-center gap-4 flex-wrap">
                  {getStatusBadge(tournament.status)}
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    <Users className="w-3 h-3 mr-1" />
                    {registrationCount}/{tournament.max_players} Players
                  </Badge>
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDateTime(tournament.start_time)}
                  </Badge>
                  {tournament.check_in_required && (
                    <Badge variant="outline" className="border-green-600 text-green-300">
                      {checkedInCount} Checked In
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('admin')}
                    className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate('/tournaments')}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Back to Tournaments
                </Button>
              </div>
            </div>
            
            {tournament.description && (
              <p className="text-slate-400 mt-4">{tournament.description}</p>
            )}
          </CardHeader>
        </Card>

        {/* Tournament Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-slate-300 data-[state=active]:text-white">
              Participants ({registrationCount})
            </TabsTrigger>
            <TabsTrigger value="bracket" className="text-slate-300 data-[state=active]:text-white">
              Bracket
            </TabsTrigger>
            <TabsTrigger value="matches" className="text-slate-300 data-[state=active]:text-white">
              Matches
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="balancing" className="text-slate-300 data-[state=active]:text-white">
                Team Balancing
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="admin" className="text-slate-300 data-[state=active]:text-white">
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <TournamentRegistration
                tournament={tournament}
                isRegistered={isRegistered}
                registrationCount={registrationCount}
                checkedInCount={checkedInCount}
                onRegistrationUpdate={handleRegistrationUpdate}
              />
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Tournament Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 text-sm">Format</p>
                      <p className="text-white font-medium">{tournament.bracket_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Match Format</p>
                      <p className="text-white font-medium">{tournament.match_format}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Team Size</p>
                      <p className="text-white font-medium">{tournament.team_size} players</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Max Teams</p>
                      <p className="text-white font-medium">{tournament.max_teams}</p>
                    </div>
                  </div>

                  {tournament.prize_pool && (
                    <div>
                      <p className="text-slate-400 text-sm">Prize Pool</p>
                      <p className="text-white font-medium">{tournament.prize_pool}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div>
                      <p className="text-slate-400 text-sm">Registration</p>
                      <p className="text-white text-sm">
                        {formatDateTime(tournament.registration_opens_at)} - {formatDateTime(tournament.registration_closes_at)}
                      </p>
                    </div>
                    
                    {tournament.check_in_required && (
                      <div>
                        <p className="text-slate-400 text-sm">Check-in Period</p>
                        <p className="text-white text-sm">
                          {formatDateTime(tournament.check_in_starts_at)} - {formatDateTime(tournament.check_in_ends_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="participants">
            <TournamentParticipants 
              tournamentId={tournament.id} 
              onUpdate={handleRegistrationUpdate}
            />
          </TabsContent>

          <TabsContent value="bracket" className="space-y-6">
            <div className="grid gap-6">
              {isAdmin && tournament.status === 'balancing' && (
                <BracketGenerator
                  tournamentId={tournament.id}
                  tournament={{
                    status: tournament.status,
                    max_teams: tournament.max_teams,
                    bracket_type: tournament.bracket_type,
                    match_format: tournament.match_format,
                    final_match_format: tournament.final_match_format,
                    semifinal_match_format: tournament.semifinal_match_format,
                    enable_map_veto: tournament.enable_map_veto,
                    map_veto_required_rounds: tournament.map_veto_required_rounds
                  }}
                  teams={teams}
                  onBracketGenerated={handleTournamentUpdate}
                />
              )}
              
              <IntegratedBracketView tournamentId={tournament.id} />
            </div>
          </TabsContent>

          <TabsContent value="matches">
            <MatchManager 
              tournamentId={tournament.id}
              onMatchUpdate={handleTournamentUpdate}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="balancing">
              <TeamBalancingInterface
                tournamentId={tournament.id}
                tournament={tournament}
                onTeamsUpdated={handleTournamentUpdate}
              />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="admin">
              <ComprehensiveTournamentEditor
                tournament={tournament}
                onTournamentUpdated={handleTournamentUpdate}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default TournamentDetail;
