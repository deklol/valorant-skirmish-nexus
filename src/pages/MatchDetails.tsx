import { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Calendar, Clock, ArrowLeft, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import ScoreReporting from "@/components/ScoreReporting";
import MapVetoManager from "@/components/MapVetoManager";
import MatchTeamBalancing from "@/components/MatchTeamBalancing";

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
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  team1?: { 
    id: string;
    name: string; 
  } | null;
  team2?: { 
    id: string;
    name: string; 
  } | null;
  tournament?: {
    id: string;
    name: string;
  } | null;
}

const MatchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchMatch();
      if (user) {
        checkUserTeam();
        checkAdminStatus();
      }
    }
  }, [id, user]);

  // Real-time subscription for match updates
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
          fetchMatch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchMatch = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (id, name),
          team2:teams!matches_team2_id_fkey (id, name),
          tournament:tournaments!matches_tournament_id_fkey (id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setMatch(data);
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

  const checkUserTeam = async () => {
    if (!user || !id) return;

    try {
      // First get the match to find team IDs
      const { data: matchData } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', id)
        .single();

      if (!matchData || (!matchData.team1_id && !matchData.team2_id)) return;

      // Check if user is in either team
      const teamIds = [matchData.team1_id, matchData.team2_id].filter(Boolean);
      
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .in('team_id', teamIds)
        .single();

      setUserTeamId(teamMember?.team_id || null);
    } catch (error) {
      // User is not in any of the teams
      setUserTeamId(null);
    }
  };

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'live':
        return <Badge className="bg-green-600">Live</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600">Completed</Badge>;
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
            <p className="text-white text-lg">Loading match details...</p>
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
            <Button onClick={() => navigate(-1)} className="mt-4 bg-red-600 hover:bg-red-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
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
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            className="text-slate-300 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
              </h1>
              <div className="flex items-center gap-2 text-slate-400">
                {getStatusBadge(match.status)}
                <span>Round {match.round_number}</span>
                <span>•</span>
                <span>Match #{match.match_number}</span>
                {match.tournament && (
                  <>
                    <span>•</span>
                    <span>{match.tournament.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="text-slate-300 data-[state=active]:text-white">
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team 1: {match.team1?.name || 'TBD'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white">
                      {match.score_team1 || 0}
                    </div>
                    <div className="text-slate-400">Score</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team 2: {match.team2?.name || 'TBD'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white">
                      {match.score_team2 || 0}
                    </div>
                    <div className="text-slate-400">Score</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Map Veto Manager */}
            {match.team1_id && match.team2_id && (
              <MapVetoManager
                matchId={match.id}
                team1Id={match.team1_id}
                team2Id={match.team2_id}
                team1Name={match.team1?.name || 'Team 1'}
                team2Name={match.team2?.name || 'Team 2'}
                matchStatus={match.status}
                userTeamId={userTeamId}
                isAdmin={isAdmin}
              />
            )}

            {/* Match Details */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Match Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-400">Scheduled Time</div>
                    <div className="text-white">
                      {match.scheduled_time ? new Date(match.scheduled_time).toLocaleString() : 'Not scheduled'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Status</div>
                    <div className="text-white">{getStatusBadge(match.status)}</div>
                  </div>
                  {match.started_at && (
                    <div>
                      <div className="text-sm text-slate-400">Started</div>
                      <div className="text-white">{new Date(match.started_at).toLocaleString()}</div>
                    </div>
                  )}
                  {match.completed_at && (
                    <div>
                      <div className="text-sm text-slate-400">Completed</div>
                      <div className="text-white">{new Date(match.completed_at).toLocaleString()}</div>
                    </div>
                  )}
                </div>

                {match.winner_id && (
                  <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <div className="text-green-400 font-medium">Winner:</div>
                    <div className="text-white text-lg">
                      {match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score Reporting */}
            {match.status !== 'completed' && (userTeamId || isAdmin) && (
              <ScoreReporting
                match={match}
                onScoreSubmitted={() => {
                  fetchMatch();
                  toast({
                    title: "Score Reported",
                    description: "Match score has been submitted",
                  });
                }}
              />
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <MatchTeamBalancing
                matchId={match.id}
                team1Id={match.team1_id}
                team2Id={match.team2_id}
                tournamentId={match.tournament?.id || ''}
                onTeamsRebalanced={() => {
                  fetchMatch();
                  toast({
                    title: "Teams Updated",
                    description: "Match teams have been rebalanced",
                  });
                }}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default MatchDetails;
