
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Map, Trophy, Clock, Settings, UserCheck, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BracketGenerator from "@/components/BracketGenerator";
import TournamentStatusManager from "@/components/TournamentStatusManager";
import TournamentParticipants from "@/components/TournamentParticipants";
import TournamentRegistration from "@/components/TournamentRegistration";
import IntegratedBracketView from "@/components/IntegratedBracketView";
import TournamentWinnerDisplay from "@/components/TournamentWinnerDisplay";
import ComprehensiveTournamentEditor from "@/components/ComprehensiveTournamentEditor";
import ForceCheckInManager from "@/components/ForceCheckInManager";
import TeamBalancingInterface from "@/components/TeamBalancingInterface";

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: string;
  max_teams: number;
  max_players: number;
  team_size: number;
  bracket_type: string;
  match_format: string;
  final_match_format?: string;
  semifinal_match_format?: string;
  enable_map_veto: boolean;
  map_veto_required_rounds: number[];
  start_time: string;
  prize_pool?: string;
  registration_opens_at: string;
  registration_closes_at: string;
  check_in_starts_at: string;
  check_in_ends_at: string;
  check_in_required: boolean;
  created_at: string;
  teams?: Team[];
  matches?: Match[];
}

interface Team {
  id: string;
  name: string;
  seed?: number;
  total_rank_points: number;
  team_members: TeamMember[];
}

interface TeamMember {
  user_id: string;
  is_captain: boolean;
  users: User;
}

interface User {
  discord_username: string;
  discord_avatar_url: string | null;
  current_rank: string;
  riot_id: string;
}

interface Match {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  team1_id: string;
  team2_id: string;
  winner_id: string | null;
  status: string;
  score_team1: number;
  score_team2: number;
  best_of: number;
  map_veto_enabled: boolean;
  scheduled_time?: string;
  started_at?: string;
  completed_at?: string;
  team1: { name: string };
  team2: { name: string };
  winner: { name: string } | null;
}

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchTournamentDetails();
    }
  }, [id, refreshKey]);

  const parseMapVetoRounds = (value: any): number[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === 'number') return item;
        if (typeof item === 'string') {
          const parsed = parseInt(item, 10);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      }).filter(num => num > 0);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(item => parseInt(item, 10)).filter(num => !isNaN(num)) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const fetchTournamentDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching tournament details for ID:', id);

      // Fetch tournament with all related data
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          *,
          teams (
            *,
            team_members (
              user_id,
              is_captain,
              users (
                discord_username,
                discord_avatar_url,
                current_rank,
                riot_id
              )
            )
          ),
          matches (
            *,
            team1:teams!matches_team1_id_fkey (name),
            team2:teams!matches_team2_id_fkey (name),
            winner:teams!matches_winner_id_fkey (name)
          )
        `)
        .eq('id', id)
        .single();

      if (tournamentError) {
        console.error('Tournament fetch error:', tournamentError);
        throw tournamentError;
      }

      console.log('Tournament data fetched:', tournamentData);
      
      const parsedTournament: Tournament = {
        ...tournamentData,
        enable_map_veto: tournamentData.enable_map_veto || false,
        map_veto_required_rounds: parseMapVetoRounds(tournamentData.map_veto_required_rounds),
        check_in_required: tournamentData.check_in_required ?? true,
        registration_opens_at: tournamentData.registration_opens_at || tournamentData.start_time,
        registration_closes_at: tournamentData.registration_closes_at || tournamentData.start_time,
        check_in_starts_at: tournamentData.check_in_starts_at || tournamentData.start_time,
        check_in_ends_at: tournamentData.check_in_ends_at || tournamentData.start_time
      };
      
      setTournament(parsedTournament);
      setTeams(tournamentData.teams || []);
      setMatches(tournamentData.matches || []);

      // Fetch signups separately for better performance
      const { data: signupsData, error: signupsError } = await supabase
        .from('tournament_signups')
        .select(`
          *,
          users (
            id,
            discord_username,
            current_rank,
            rank_points,
            weight_rating,
            discord_avatar_url,
            riot_id
          )
        `)
        .eq('tournament_id', id);

      if (signupsError) {
        console.error('Signups fetch error:', signupsError);
        throw signupsError;
      }

      console.log('Signups data fetched:', signupsData);
      setSignups(signupsData || []);

    } catch (error: any) {
      console.error('Error fetching tournament details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load tournament details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "bg-gray-500/20 text-gray-400",
      open: "bg-green-500/20 text-green-400",
      balancing: "bg-yellow-500/20 text-yellow-400",
      live: "bg-red-500/20 text-red-400",
      completed: "bg-blue-500/20 text-blue-400",
      archived: "bg-slate-500/20 text-slate-400"
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.draft}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Tournament not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Tournament Header */}
        <Card className="bg-slate-800/90 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-white">{tournament.name}</CardTitle>
                {tournament.description && (
                  <p className="text-slate-300 mt-2">{tournament.description}</p>
                )}
              </div>
              {getStatusBadge(tournament.status)}
            </div>
          </CardHeader>
          <CardContent className="text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(tournament.start_time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{tournament.team_size}v{tournament.team_size} • {tournament.max_teams} Teams</span>
              </div>
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                <span>{tournament.match_format}</span>
              </div>
              {tournament.prize_pool && (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span>{tournament.prize_pool}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tournament Winner Display - Show for completed tournaments */}
        {tournament.status === 'completed' && (
          <TournamentWinnerDisplay 
            tournamentId={tournament.id}
            tournamentStatus={tournament.status}
          />
        )}

        {/* Registration Component - Available to all users */}
        {tournament.status === 'open' && (
          <TournamentRegistration
            tournamentId={tournament.id}
            tournament={tournament}
            onRegistrationChange={handleRefresh}
          />
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="admin" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </TabsTrigger>
                <TabsTrigger value="players" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Players
                </TabsTrigger>
                <TabsTrigger value="balancing" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  <Scale className="w-4 h-4 mr-2" />
                  Balance
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Overview Tab - Available to all users */}
          <TabsContent value="overview" className="space-y-6">
            {/* Tournament Participants */}
            <TournamentParticipants
              tournamentId={tournament.id}
              maxPlayers={tournament.max_players}
              isAdmin={isAdmin}
            />

            {/* Bracket View */}
            {matches.length > 0 && (
              <Card className="bg-slate-800/90 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Tournament Bracket
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <IntegratedBracketView
                    tournamentId={tournament.id}
                  />
                </CardContent>
              </Card>
            )}

            {/* Tournament Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tournament Details */}
              <Card className="bg-slate-800/90 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white">Tournament Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-400">Format</div>
                      <div className="text-white">{tournament.bracket_type.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Team Size</div>
                      <div className="text-white">{tournament.team_size}v{tournament.team_size}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Max Teams</div>
                      <div className="text-white">{tournament.max_teams}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Max Players</div>
                      <div className="text-white">{tournament.max_players}</div>
                    </div>
                  </div>
                  
                  {tournament.enable_map_veto && (
                    <div>
                      <div className="text-sm text-slate-400">Map Veto</div>
                      <div className="text-white">Enabled</div>
                      {tournament.map_veto_required_rounds.length > 0 && (
                        <div className="text-sm text-slate-500">
                          Required rounds: {tournament.map_veto_required_rounds.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Tournament Timeline */}
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-400">Registration Opens</div>
                      <div className="text-white text-sm">{formatDate(tournament.registration_opens_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-400">Registration Closes</div>
                      <div className="text-white text-sm">{formatDate(tournament.registration_closes_at)}</div>
                    </div>
                  </div>
                  {tournament.check_in_required && (
                    <>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="text-sm text-slate-400">Check-in Starts</div>
                          <div className="text-white text-sm">{formatDate(tournament.check_in_starts_at)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="text-sm text-slate-400">Check-in Ends</div>
                          <div className="text-white text-sm">{formatDate(tournament.check_in_ends_at)}</div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-400">Tournament Starts</div>
                      <div className="text-white text-sm">{formatDate(tournament.start_time)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admin Management Tab */}
          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              {/* Comprehensive Tournament Editor */}
              <ComprehensiveTournamentEditor
                tournament={tournament}
                onTournamentUpdated={handleRefresh}
              />

              {/* Tournament Status Manager & Bracket Generator */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TournamentStatusManager
                  tournamentId={tournament.id}
                  currentStatus={tournament.status}
                  onStatusChange={handleRefresh}
                />

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
                  onBracketGenerated={handleRefresh}
                />
              </div>
            </TabsContent>
          )}

          {/* Player Management Tab */}
          {isAdmin && (
            <TabsContent value="players" className="space-y-6">
              {/* Force Check-In Manager */}
              <ForceCheckInManager
                tournamentId={tournament.id}
                onCheckInUpdate={handleRefresh}
              />

              {/* Tournament Participants with Admin Controls */}
              <TournamentParticipants
                tournamentId={tournament.id}
                maxPlayers={tournament.max_players}
                isAdmin={true}
              />
            </TabsContent>
          )}

          {/* Team Balancing Tab */}
          {isAdmin && (
            <TabsContent value="balancing" className="space-y-6">
              <TeamBalancingInterface
                tournamentId={tournament.id}
                maxTeams={tournament.max_teams}
                teamSize={tournament.team_size}
                onTeamsUpdated={handleRefresh}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default TournamentDetail;
