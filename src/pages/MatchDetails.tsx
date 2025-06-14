import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, Trophy, Map, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import MapVetoManager from "@/components/MapVetoManager";

interface MatchDetail {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  status: "pending" | "live" | "completed";
  best_of: number;
  score_team1: number;
  score_team2: number;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  stream_url: string | null;
  notes: string | null;
  team1?: { id: string; name: string } | null;
  team2?: { id: string; name: string } | null;
  winner?: { id: string; name: string } | null;
  tournament?: { name: string } | null;
}

interface MatchMap {
  id: string;
  map_order: number;
  team1_score: number;
  team2_score: number;
  winner_team_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  map?: { name: string; display_name: string };
}

const MatchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [matchMaps, setMatchMaps] = useState<MatchMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [vetoDialogOpen, setVetoDialogOpen] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!id) return;

      try {
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey (id, name),
            team2:teams!matches_team2_id_fkey (id, name),
            winner:teams!matches_winner_id_fkey (id, name),
            tournament:tournaments!matches_tournament_id_fkey (name)
          `)
          .eq('id', id)
          .single();

        if (matchError) throw matchError;

        const { data: mapsData, error: mapsError } = await supabase
          .from('match_maps')
          .select(`
            *,
            maps:map_id (name, display_name)
          `)
          .eq('match_id', id)
          .order('map_order');

        if (mapsError) throw mapsError;

        setMatch(matchData);
        setMatchMaps(mapsData || []);

        // Check if user is part of either team
        if (user && matchData.team1_id && matchData.team2_id) {
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .in('team_id', [matchData.team1_id, matchData.team2_id])
            .single();

          if (teamMember) {
            setUserTeamId(teamMember.team_id);
          }
        }

      } catch (error: any) {
        console.error('Error fetching match:', error);
        toast({
          title: "Error",
          description: "Failed to load match details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [id, user, toast]);

  // Add real-time subscription for match updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`match-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${id}`
        },
        () => {
          // Refetch match data when updated
          fetchMatchDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gray-500/20 text-gray-400",
      live: "bg-red-500/20 text-red-400",
      completed: "bg-green-500/20 text-green-400"
    };

    return (
      <Badge className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
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
            <p className="text-white text-lg">Loading match...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Match not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Match Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {match.team1?.name || "TBD"} vs {match.team2?.name || "TBD"}
            </h1>
            <div className="flex items-center gap-4 mb-4">
              {getStatusBadge(match.status)}
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                Best of {match.best_of}
              </Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                Round {match.round_number}
              </Badge>
            </div>
            <p className="text-slate-400">{match.tournament?.name}</p>
          </div>
          
          <div className="flex gap-2">
            {isAdmin && (
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Settings className="w-4 h-4 mr-2" />
                Manage Match
              </Button>
            )}
          </div>
        </div>

        {/* Score Display */}
        <Card className="bg-slate-800 border-slate-700 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-white mb-2">{match.team1?.name || "TBD"}</div>
                <div className="text-4xl font-bold text-blue-500">{match.score_team1}</div>
              </div>
              
              <div className="text-center px-8">
                <div className="text-slate-400 text-lg">vs</div>
                {match.status === 'completed' && match.winner && (
                  <div className="mt-2">
                    <Trophy className="w-6 h-6 text-yellow-500 mx-auto" />
                    <div className="text-yellow-500 text-sm mt-1">Winner</div>
                  </div>
                )}
              </div>
              
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-white mb-2">{match.team2?.name || "TBD"}</div>
                <div className="text-4xl font-bold text-red-500">{match.score_team2}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-slate-400 mb-2" />
              <div className="text-white font-medium">Scheduled</div>
              <div className="text-slate-400 text-sm">{formatDateTime(match.scheduled_time)}</div>
            </CardContent>
          </Card>
          
          {match.started_at && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto text-green-400 mb-2" />
                <div className="text-white font-medium">Started</div>
                <div className="text-slate-400 text-sm">{formatDateTime(match.started_at)}</div>
              </CardContent>
            </Card>
          )}
          
          {match.completed_at && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Trophy className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
                <div className="text-white font-medium">Completed</div>
                <div className="text-slate-400 text-sm">{formatDateTime(match.completed_at)}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map Veto Manager - Add this before the tabs */}
        {match.team1 && match.team2 && (
          <div className="mb-8">
            <MapVetoManager
              matchId={match.id}
              team1Id={match.team1.id}
              team2Id={match.team2.id}
              team1Name={match.team1.name}
              team2Name={match.team2.name}
              matchStatus={match.status}
              userTeamId={userTeamId}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="maps" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="maps" className="text-white data-[state=active]:bg-red-600">Maps</TabsTrigger>
            <TabsTrigger value="details" className="text-white data-[state=active]:bg-red-600">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="maps" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Map Results</CardTitle>
              </CardHeader>
              <CardContent>
                {matchMaps.length === 0 ? (
                  <div className="text-center py-8">
                    <Map className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-400">No maps played yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matchMaps.map((matchMap) => (
                      <div key={matchMap.id} className="bg-slate-700 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-medium">Map {matchMap.map_order}: {matchMap.map?.display_name}</h3>
                            <div className="text-slate-400 text-sm mt-1">
                              {matchMap.completed_at ? 'Completed' : matchMap.started_at ? 'In Progress' : 'Pending'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white text-lg font-bold">
                              {matchMap.team1_score} - {matchMap.team2_score}
                            </div>
                            {matchMap.winner_team_id && (
                              <div className="text-yellow-500 text-sm">
                                {matchMap.winner_team_id === match.team1?.id ? match.team1?.name : match.team2?.name} wins
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Match Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-white font-medium mb-2">Tournament</h4>
                    <p className="text-slate-400">{match.tournament?.name}</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2">Format</h4>
                    <p className="text-slate-400">Best of {match.best_of}</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2">Round</h4>
                    <p className="text-slate-400">Round {match.round_number}, Match {match.match_number}</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2">Status</h4>
                    {getStatusBadge(match.status)}
                  </div>
                </div>
                
                {match.stream_url && (
                  <div>
                    <h4 className="text-white font-medium mb-2">Stream</h4>
                    <a 
                      href={match.stream_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Watch Live Stream
                    </a>
                  </div>
                )}
                
                {match.notes && (
                  <div>
                    <h4 className="text-white font-medium mb-2">Notes</h4>
                    <p className="text-slate-400">{match.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MatchDetails;
