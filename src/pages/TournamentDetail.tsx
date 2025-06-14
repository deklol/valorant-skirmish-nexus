
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Map, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BracketGenerator from "@/components/BracketGenerator";

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_teams: number;
  bracket_type: string;
  match_format: string;
  final_match_format?: string;
  semifinal_match_format?: string;
  enable_map_veto: boolean;
  map_veto_required_rounds: number[];
  start_time: string;
  teams?: Team[];
  matches?: Match[];
}

interface Team {
  id: string;
  name: string;
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
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (id) {
      fetchTournamentDetails();
    }
  }, [id]);

  const parseMapVetoRounds = (value: any): number[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      // Handle array of numbers or strings that can be converted to numbers
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
                discord_avatar_url
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
      
      // Parse the tournament data and handle JSON fields properly
      const parsedTournament: Tournament = {
        ...tournamentData,
        enable_map_veto: tournamentData.enable_map_veto || false,
        map_veto_required_rounds: parseMapVetoRounds(tournamentData.map_veto_required_rounds)
      };
      
      setTournament(parsedTournament);
      setTeams(tournamentData.teams || []);
      setMatches(tournamentData.matches || []);

      // Fetch signups
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
            discord_avatar_url
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
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white">Loading tournament details...</p>
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
            <p className="text-white">Tournament not found</p>
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
              <CardTitle className="text-2xl font-bold text-white">{tournament.name}</CardTitle>
              {getStatusBadge(tournament.status)}
            </div>
          </CardHeader>
          <CardContent className="text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(tournament.start_time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{tournament.max_teams} Teams</span>
              </div>
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                <span>{tournament.match_format}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Management (Admin Only) */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              onBracketGenerated={fetchTournamentDetails}
            />

            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Shuffle className="w-5 h-5" />
                  Team Balancing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Automatically balance teams based on player weight ratings.
                </p>
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                  Balance Teams
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Signups */}
        <Card className="bg-slate-800/90 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Signups ({signups.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {signups.length === 0 ? (
              <p className="text-slate-400">No signups yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {signups.map((signup) => (
                  <div key={signup.id} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={signup.users?.discord_avatar_url} />
                      <AvatarFallback>{signup.users?.discord_username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-white">{signup.users?.discord_username}</div>
                      <div className="text-sm text-slate-400">{signup.users?.current_rank}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bracket */}
        <Card className="bg-slate-800/90 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Bracket</CardTitle>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <p className="text-slate-400">Bracket not generated yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className="text-slate-400 font-medium py-2">Round</th>
                      <th className="text-slate-400 font-medium py-2">Match</th>
                      <th className="text-slate-400 font-medium py-2">Team 1</th>
                      <th className="text-slate-400 font-medium py-2">Team 2</th>
                      <th className="text-slate-400 font-medium py-2">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                      <tr key={match.id} className="border-b border-slate-700">
                        <td className="py-3 text-white">{match.round_number}</td>
                        <td className="py-3 text-white">{match.match_number}</td>
                        <td className="py-3 text-white">{match.team1?.name || 'TBD'}</td>
                        <td className="py-3 text-white">{match.team2?.name || 'TBD'}</td>
                        <td className="py-3 text-green-400">{match.winner?.name || 'TBD'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TournamentDetail;
