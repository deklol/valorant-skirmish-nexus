import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, Trophy, Calendar, MapPin, Settings, Eye, Crown, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import TournamentParticipants from "@/components/TournamentParticipants";
import DiscordWebhookManager from "@/components/DiscordWebhookManager";
import TeamBalancingTool from "@/components/TeamBalancingTool";
import TournamentRegistration from "@/components/TournamentRegistration";
import BracketGenerator from "@/components/BracketGenerator";
import MatchManager from "@/components/MatchManager";
import TournamentStatusManager from "@/components/TournamentStatusManager";
import IntegratedBracketView from "@/components/IntegratedBracketView";

interface TournamentDetail {
  id: string;
  name: string;
  description: string;
  status: "draft" | "open" | "balancing" | "live" | "completed" | "archived";
  match_format: "BO1" | "BO3" | "BO5";
  max_players: number;
  max_teams: number;
  prize_pool: string;
  start_time: string;
  end_time: string;
  registration_opens_at: string;
  registration_closes_at: string;
  check_in_starts_at: string;
  check_in_ends_at: string;
  check_in_required: boolean;
  bracket_type: string;
  created_at: string;
  signups?: number;
  teams?: any[];
}

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [signups, setSignups] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTournamentDetail();
  }, [id]);

  const fetchTournamentDetail = async () => {
    if (!id) return;

    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;

      const { data: signupsData, error: signupsError } = await supabase
        .from('tournament_signups')
        .select(`
          *,
          users:user_id (
            discord_username,
            riot_id,
            current_rank
          )
        `)
        .eq('tournament_id', id);

      if (signupsError) throw signupsError;

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (
            *,
            users:user_id (
              discord_username,
              riot_id,
              current_rank,
              is_phantom
            )
          )
        `)
        .eq('tournament_id', id);

      if (teamsError) throw teamsError;

      setTournament({
        ...tournamentData,
        signups: signupsData?.length || 0
      });
      setSignups(signupsData || []);
      setTeams(teamsData || []);
    } catch (error: any) {
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

  const setCaptain = async (teamId: string, userId: string) => {
    try {
      await supabase
        .from('team_members')
        .update({ is_captain: false })
        .eq('team_id', teamId);

      const { error } = await supabase
        .from('team_members')
        .update({ is_captain: true })
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team captain updated successfully",
      });

      const { data: teamsData } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (
            *,
            users:user_id (
              discord_username,
              riot_id,
              current_rank,
              is_phantom
            )
          )
        `)
        .eq('tournament_id', id);

      if (teamsData) setTeams(teamsData);
    } catch (error: any) {
      console.error('Error setting captain:', error);
      toast({
        title: "Error",
        description: "Failed to update team captain",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-gray-500/20 text-gray-400",
      open: "bg-green-500/20 text-green-400",
      balancing: "bg-yellow-500/20 text-yellow-400",
      live: "bg-red-500/20 text-red-400",
      completed: "bg-blue-500/20 text-blue-400",
      archived: "bg-slate-500/20 text-slate-400"
    };

    return (
      <Badge className={variants[status] || variants.draft}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Loading tournament...</p>
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
            <Link to="/tournaments">
              <Button className="mt-4">Back to Tournaments</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{tournament.name}</h1>
            <div className="flex items-center gap-4 mb-4">
              {getStatusBadge(tournament.status)}
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {tournament.match_format}
              </Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {tournament.bracket_type.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-slate-400 max-w-2xl">{tournament.description}</p>
          </div>
          
          <div className="flex gap-2">
            <Link to={`/bracket/${tournament.id}`}>
              <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
                <Eye className="w-4 h-4 mr-2" />
                View Bracket
              </Button>
            </Link>
            {isAdmin && (
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
        </div>

        {/* Tournament Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500">{tournament.prize_pool}</div>
              <div className="text-sm text-slate-300">Prize Pool</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{tournament.signups}/{tournament.max_players}</div>
              <div className="text-sm text-slate-300">Players Signed Up</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{teams.length}/{tournament.max_teams}</div>
              <div className="text-sm text-slate-300">Teams Formed</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{formatDate(tournament.start_time)}</div>
              <div className="text-sm text-slate-300">Start Time</div>
            </CardContent>
          </Card>
        </div>

        {/* Registration Component - Show for non-admin users when registration is open */}
        {!isAdmin && tournament.status === 'open' && (
          <div className="mb-8">
            <TournamentRegistration
              tournamentId={tournament.id}
              tournament={tournament}
              onRegistrationChange={fetchTournamentDetail}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-red-600">Overview</TabsTrigger>
            <TabsTrigger value="bracket" className="text-white data-[state=active]:bg-red-600">Bracket</TabsTrigger>
            <TabsTrigger value="participants" className="text-white data-[state=active]:bg-red-600">Participants</TabsTrigger>
            <TabsTrigger value="teams" className="text-white data-[state=active]:bg-red-600">Teams</TabsTrigger>
            <TabsTrigger value="schedule" className="text-white data-[state=active]:bg-red-600">Schedule</TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="management" className="text-white data-[state=active]:bg-red-600">Management</TabsTrigger>
                <TabsTrigger value="admin" className="text-white data-[state=active]:bg-red-600">Admin</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Tournament Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar className="w-4 h-4" />
                      <span>Registration: {formatDate(tournament.registration_opens_at)} - {formatDate(tournament.registration_closes_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4" />
                      <span>Check-in: {formatDate(tournament.check_in_starts_at)} - {formatDate(tournament.check_in_ends_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Trophy className="w-4 h-4" />
                      <span>Tournament: {formatDate(tournament.start_time)} - {formatDate(tournament.end_time)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4" />
                      <span>Max Players: {tournament.max_players}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4" />
                      <span>Max Teams: {tournament.max_teams}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-4 h-4" />
                      <span>Check-in Required: {tournament.check_in_required ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bracket" className="space-y-4">
            <IntegratedBracketView tournamentId={tournament.id} />
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            <TournamentParticipants 
              tournamentId={tournament.id}
              maxPlayers={tournament.max_players}
              isAdmin={isAdmin}
            />
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Teams ({teams.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team) => (
                    <div key={team.id} className="bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-medium text-lg">{team.name}</div>
                        <div className="text-slate-400 text-sm">Seed: #{team.seed || 'TBD'}</div>
                      </div>
                      
                      <div className="space-y-2">
                        {team.team_members?.map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between bg-slate-600 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300">
                                {member.users?.discord_username || 'Unknown'}
                              </span>
                              {member.users?.is_phantom && (
                                <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                                  Phantom
                                </Badge>
                              )}
                              {member.is_captain && (
                                <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Captain
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-sm">
                                {member.users?.current_rank || 'Unranked'}
                              </span>
                              {isAdmin && !member.is_captain && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white h-6 px-2"
                                  onClick={() => setCaptain(team.id, member.user_id)}
                                >
                                  <Crown className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-3 text-xs text-slate-500">
                        Members: {team.team_members?.length || 0} | 
                        Total Rank Points: {team.total_rank_points || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Tournament Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Registration Phase</h3>
                    <p className="text-slate-400">{formatDate(tournament.registration_opens_at)} - {formatDate(tournament.registration_closes_at)}</p>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Check-in Phase</h3>
                    <p className="text-slate-400">{formatDate(tournament.check_in_starts_at)} - {formatDate(tournament.check_in_ends_at)}</p>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Tournament</h3>
                    <p className="text-slate-400">{formatDate(tournament.start_time)} - {formatDate(tournament.end_time)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="management" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TournamentStatusManager
                  tournamentId={tournament.id}
                  currentStatus={tournament.status}
                  onStatusChange={fetchTournamentDetail}
                />
                
                {tournament.status === 'balancing' && (
                  <div className="space-y-4">
                    <TeamBalancingTool
                      tournamentId={tournament.id}
                      maxTeams={tournament.max_teams}
                      onTeamsBalanced={fetchTournamentDetail}
                    />
                    <BracketGenerator
                      tournamentId={tournament.id}
                      tournament={tournament}
                      teams={teams}
                      onBracketGenerated={fetchTournamentDetail}
                    />
                  </div>
                )}

                {(tournament.status === 'live' || tournament.status === 'completed') && (
                  <MatchManager
                    tournamentId={tournament.id}
                    onMatchUpdate={fetchTournamentDetail}
                  />
                )}
              </div>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="admin" className="space-y-4">
              <DiscordWebhookManager />
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Tournament Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Edit className="w-4 h-4 mr-2" />
                      Generate Bracket
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <Trophy className="w-4 h-4 mr-2" />
                      Update Match Scores
                    </Button>
                  </div>
                  
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Tournament Flow:</h4>
                    <ul className="text-slate-300 text-sm space-y-1">
                      <li>• Teams are formed during balancing phase</li>
                      <li>• Captains are set by admins (can be changed anytime)</li>
                      <li>• Map vetos happen when matches go live (BO3/BO5 only)</li>
                      <li>• Captains take turns banning/picking maps in real-time</li>
                      <li>• Admins can update scores through the bracket view</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default TournamentDetail;
