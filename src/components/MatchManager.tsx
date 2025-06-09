
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Flag, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import MatchResultsSubmission from './MatchResultsSubmission';
import processMatchResults from './MatchResultsProcessor';

interface MatchManagerProps {
  tournamentId: string;
  onMatchUpdate: () => void;
}

const MatchManager = ({ tournamentId, onMatchUpdate }: MatchManagerProps) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, [tournamentId]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (id, name),
          team2:team2_id (id, name),
          winner:winner_id (id, name)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;

      // Get user's team for this tournament
      let userTeamId = null;
      let isUserCaptain = false;

      if (user) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select(`
            team_id,
            is_captain,
            team:team_id (tournament_id)
          `)
          .eq('user_id', user.id)
          .single();

        if (teamMember && teamMember.team?.tournament_id === tournamentId) {
          userTeamId = teamMember.team_id;
          isUserCaptain = teamMember.is_captain || false;
        }
      }

      // Add user team info to each match
      const enhancedMatches = data?.map(match => ({
        ...match,
        userTeamId,
        isUserCaptain,
        isUserInMatch: userTeamId && (match.team1_id === userTeamId || match.team2_id === userTeamId),
        canSubmitResults: isUserCaptain && userTeamId && (match.team1_id === userTeamId || match.team2_id === userTeamId)
      }));

      setMatches(enhancedMatches || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMatches = () => {
    switch (activeTab) {
      case 'pending':
        return matches.filter(m => m.status === 'pending');
      case 'live':
        return matches.filter(m => m.status === 'live');
      case 'completed':
        return matches.filter(m => m.status === 'completed');
      case 'my-matches':
        return matches.filter(m => m.isUserInMatch);
      default:
        return matches;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-900/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case 'live':
        return <Badge variant="outline" className="bg-green-900/20 text-green-500 border-green-500/30">Live</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-900/20 text-blue-500 border-blue-500/30">Completed</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-700 text-slate-300">Unknown</Badge>;
    }
  };

  const handleResultsSubmitted = () => {
    fetchMatches();
    onMatchUpdate();
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <p className="text-slate-400">Loading matches...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Matches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="space-y-4"
        >
          <TabsList className="bg-slate-700">
            <TabsTrigger value="all" className="text-white data-[state=active]:bg-red-600">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-white data-[state=active]:bg-red-600">Pending</TabsTrigger>
            <TabsTrigger value="live" className="text-white data-[state=active]:bg-red-600">Live</TabsTrigger>
            <TabsTrigger value="completed" className="text-white data-[state=active]:bg-red-600">Completed</TabsTrigger>
            {user && <TabsTrigger value="my-matches" className="text-white data-[state=active]:bg-red-600">My Matches</TabsTrigger>}
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {getFilteredMatches().length === 0 ? (
              <div className="text-center p-6 text-slate-400">
                No matches found.
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredMatches().map((match) => (
                  <Card key={match.id} className="bg-slate-700 border-slate-600 overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-slate-900/50 text-slate-300">
                              Round {match.round_number}
                            </Badge>
                            {getStatusBadge(match.status)}
                          </div>
                          {match.scheduled_time && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(match.scheduled_time).toLocaleDateString()}</span>
                              <Clock className="w-3 h-3 ml-2" />
                              <span>{new Date(match.scheduled_time).toLocaleTimeString()}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {match.isUserInMatch && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                              Your Match
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/match/${match.id}`)}
                            className="text-xs h-7 px-2 bg-slate-800 hover:bg-slate-900"
                          >
                            Details
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 items-center mb-4">
                        <div className="col-span-2 text-right text-white font-medium">
                          {match.team1?.name || 'TBD'}
                        </div>
                        
                        <div className="col-span-1 text-center">
                          <div className="text-slate-300 text-lg font-bold">
                            {match.score_team1 !== null && match.score_team2 !== null 
                              ? `${match.score_team1} - ${match.score_team2}` 
                              : 'VS'}
                          </div>
                        </div>
                        
                        <div className="col-span-2 text-left text-white font-medium">
                          {match.team2?.name || 'TBD'}
                        </div>
                      </div>

                      {match.winner && (
                        <div className="flex items-center justify-center gap-2 mt-3 text-green-400">
                          <Trophy className="w-4 h-4" />
                          <span className="font-medium">{match.winner.name} won</span>
                        </div>
                      )}
                      
                      {match.status !== 'completed' &&
                       match.canSubmitResults && 
                       match.team1 && 
                       match.team2 && (
                        <div className="mt-4">
                          <MatchResultsSubmission 
                            matchId={match.id}
                            team1={match.team1}
                            team2={match.team2}
                            userTeamId={match.userTeamId}
                            isUserCaptain={match.isUserCaptain}
                            currentScore={{ team1: match.score_team1 || 0, team2: match.score_team2 || 0 }}
                            onResultsSubmitted={handleResultsSubmitted}
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MatchManager;
