import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Trophy, MapPin, Clock, ArrowLeft, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import TournamentRegistration from "@/components/TournamentRegistration";
import TournamentParticipants from "@/components/TournamentParticipants";
import ComprehensiveTournamentEditor from "@/components/ComprehensiveTournamentEditor";
import CheckInEnforcement from "@/components/CheckInEnforcement";
import TeamBalancingInterface from "@/components/TeamBalancingInterface";
import TournamentAutomation from "@/components/TournamentAutomation";
import TournamentStatusManager from "@/components/TournamentStatusManager";
import MatchManager from "@/components/MatchManager";
import IntegratedBracketView from "@/components/IntegratedBracketView";
import TournamentWinnerDisplay from "@/components/TournamentWinnerDisplay";

// Remove the conflicting Tournament interface - use the data as it comes from Supabase

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [tournament, setTournament] = useState<any>(null);
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTournamentDetails();
      fetchSignups();
    }
  }, [id]);

  const fetchTournamentDetails = async () => {
    if (!id) return;

    try {
      console.log('Fetching tournament details for ID:', id);
      
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          teams (
            id,
            name,
            seed,
            status,
            captain_id,
            created_at,
            updated_at,
            team_members (
              user_id,
              is_captain,
              users (
                riot_id,
                current_rank,
                discord_username,
                discord_avatar_url
              )
            ),
            tournament_id,
            total_rank_points
          ),
          matches (
            id,
            notes,
            team1:teams!matches_team1_id_fkey (name),
            team2:teams!matches_team2_id_fkey (name),
            status,
            winner:teams!matches_winner_id_fkey (name),
            best_of,
            team1_id,
            team2_id,
            winner_id,
            created_at,
            started_at,
            stream_url,
            updated_at,
            score_team1,
            score_team2,
            completed_at,
            match_number,
            round_number,
            tournament_id,
            scheduled_time,
            bracket_position,
            map_veto_enabled
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      console.log('Tournament data fetched:', data);
      setTournament(data);
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

  const fetchSignups = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select(`
          *,
          users (
            id,
            riot_id,
            rank_points,
            current_rank,
            weight_rating,
            discord_username,
            discord_avatar_url
          )
        `)
        .eq('tournament_id', id);

      if (error) throw error;

      console.log('Signups data fetched:', data);
      setSignups(data || []);
    } catch (error: any) {
      console.error('Error fetching signups:', error);
    }
  };

  const handleTournamentUpdate = () => {
    fetchTournamentDetails();
    fetchSignups();
    setEditMode(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'registrations_open': return 'bg-blue-500';
      case 'check_in': return 'bg-yellow-500';
      case 'live': return 'bg-green-500';
      case 'completed': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
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
              <ArrowLeft className="w-4 h-4 mr-2" />
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
          <Button 
            onClick={() => navigate('/tournaments')} 
            variant="ghost" 
            className="text-slate-300 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{tournament.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                  {tournament.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <span className="text-slate-400">{tournament.bracket_type.replace('_', ' ')}</span>
                <span className="text-slate-400">{tournament.match_format}</span>
              </div>
              {tournament.description && (
                <p className="text-slate-300 text-lg">{tournament.description}</p>
              )}
            </div>
            
            {isAdmin && !editMode && (
              <Button 
                onClick={() => setEditMode(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Tournament
              </Button>
            )}
          </div>
        </div>

        {editMode && isAdmin ? (
          <ComprehensiveTournamentEditor
            tournament={tournament}
            onSave={handleTournamentUpdate}
            onCancel={() => setEditMode(false)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Tournament Status and Automation */}
              {isAdmin && (
                <>
                  <TournamentStatusManager 
                    tournament={tournament} 
                    onUpdate={handleTournamentUpdate}
                  />
                  <TournamentAutomation 
                    tournament={tournament}
                    onUpdate={handleTournamentUpdate}
                  />
                </>
              )}

              {/* Check-in Management */}
              {tournament.check_in_required && (
                <CheckInEnforcement 
                  tournament={tournament}
                  signups={signups}
                  onUpdate={fetchSignups}
                />
              )}

              {/* Team Balancing Interface */}
              {tournament.status === 'check_in' && isAdmin && (
                <TeamBalancingInterface 
                  tournament={tournament}
                  onTeamsBalanced={handleTournamentUpdate}
                />
              )}

              {/* Match Management */}
              {(tournament.status === 'live' || tournament.status === 'completed') && isAdmin && (
                <MatchManager 
                  tournament={tournament}
                  onUpdate={handleTournamentUpdate}
                />
              )}

              {/* Bracket View */}
              {tournament.matches && tournament.matches.length > 0 && (
                <IntegratedBracketView 
                  tournament={tournament}
                  matches={tournament.matches}
                />
              )}

              {/* Winner Display */}
              {tournament.status === 'completed' && (
                <TournamentWinnerDisplay tournament={tournament} />
              )}

              {/* Tournament Information */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Tournament Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Max Teams: {tournament.max_teams}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Max Players: {tournament.max_players}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>Format: {tournament.team_size}v{tournament.team_size}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      <span>Prize Pool: {tournament.prize_pool || 'None'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Registration Opens: {formatDate(tournament.registration_opens_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Registration Closes: {formatDate(tournament.registration_closes_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Start Time: {formatDate(tournament.start_time)}</span>
                    </div>
                    {tournament.check_in_required && (
                      <>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Check-in Opens: {formatDate(tournament.check_in_starts_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Check-in Closes: {formatDate(tournament.check_in_ends_at)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {tournament.enable_map_veto && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-400 font-medium">
                        <MapPin className="w-4 h-4" />
                        Map Veto Enabled
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        Map veto will be available for rounds: {
                          tournament.map_veto_required_rounds?.length > 0 
                            ? tournament.map_veto_required_rounds.join(', ')
                            : 'All rounds'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Registration */}
              <TournamentRegistration 
                tournament={tournament}
                onUpdate={fetchSignups}
              />

              {/* Participants */}
              <TournamentParticipants 
                tournament={tournament}
                signups={signups}
                onUpdate={fetchSignups}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentDetail;
