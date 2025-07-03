import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Users, Crown, Calendar, ArrowLeft, Trophy, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TeamWithMembers } from "@/types/team";

const TeamProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchTeamProfile();
      fetchTeamTournaments();
    }
  }, [id]);

  const fetchTeamProfile = async () => {
    try {
      const { data: teamData, error } = await supabase
        .from('persistent_teams')
        .select(`
          id,
          name,
          description,
          created_at,
          updated_at,
          max_members,
          is_active,
          persistent_team_members (
            id,
            is_captain,
            joined_at,
            users (
              id,
              discord_username,
              current_rank,
              riot_id,
              rank_points,
              wins,
              losses,
              tournaments_won
            )
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (teamData) {
        const formattedTeam: TeamWithMembers = {
          ...teamData,
          captain_id: teamData.persistent_team_members.find(m => m.is_captain)?.users?.id || '',
          invite_code: '', // Don't expose invite codes publicly
          members: teamData.persistent_team_members?.map(member => ({
            ...member,
            team_id: teamData.id,
            user_id: member.users.id,
          })) || [],
          member_count: teamData.persistent_team_members?.length || 0,
          is_user_captain: false,
          is_user_member: false,
        };
        setTeam(formattedTeam);
      }
    } catch (error) {
      console.error('Error fetching team profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamTournaments = async () => {
    try {
      // Get team's tournament history
      const { data: tournamentsData } = await supabase
        .from('team_tournament_registrations')
        .select(`
          registered_at,
          status,
          tournaments (
            id,
            name,
            start_time,
            status,
            prize_pool
          )
        `)
        .eq('team_id', id);

      setTournaments(tournamentsData || []);
    } catch (error) {
      console.error('Error fetching team tournaments:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const captain = team?.members.find(m => m.is_captain);
  const totalWins = team?.members.reduce((sum, member) => sum + (member.users.wins || 0), 0) || 0;
  const totalLosses = team?.members.reduce((sum, member) => sum + (member.users.losses || 0), 0) || 0;
  const tournamentWins = team?.members.reduce((sum, member) => sum + (member.users.tournaments_won || 0), 0) || 0;
  const avgRankPoints = team?.members.length > 0 
    ? Math.round(team.members.reduce((sum, member) => sum + (member.users.rank_points || 0), 0) / team.members.length)
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="h-32 bg-slate-700 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-slate-700 rounded"></div>
            <div className="h-48 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold mb-2">Team Not Found</h3>
            <p className="text-slate-400 mb-4">
              The team you're looking for doesn't exist or has been deactivated.
            </p>
            <Link to="/teams-directory">
              <Button>Browse All Teams</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Back Button */}
      <Link to="/teams-directory">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams Directory
        </Button>
      </Link>

      {/* Team Header */}
      <Card className="bg-slate-800 border-slate-700 animate-fade-in">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-400" />
                {team.name}
              </CardTitle>
              {team.description && (
                <p className="text-slate-400 mt-2">{team.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {team.member_count}/{team.max_members} Members
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {formatDate(team.created_at)}
            </div>
            {captain && (
              <div className="flex items-center gap-1">
                <Crown className="h-4 w-4 text-yellow-500" />
                Captain: {captain.users.discord_username}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800 border-slate-700 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {team.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      {member.is_captain && <Crown className="h-4 w-4 text-yellow-500" />}
                      <div>
                        <p className="font-medium">{member.users.discord_username}</p>
                        <p className="text-sm text-slate-400">{member.users.riot_id}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant="outline">{member.users.current_rank}</Badge>
                      <p className="text-xs text-slate-400">
                        {member.users.wins}W / {member.users.losses}L
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tournament History */}
          {tournaments.length > 0 && (
            <Card className="bg-slate-800 border-slate-700 animate-fade-in mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Tournament History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tournaments.map((registration, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div>
                        <p className="font-medium">{registration.tournaments.name}</p>
                        <p className="text-sm text-slate-400">
                          {formatDate(registration.tournaments.start_time)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={registration.tournaments.status === 'completed' ? 'default' : 'secondary'}>
                          {registration.tournaments.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Team Stats */}
        <div className="space-y-6">
          <Card className="bg-slate-800 border-slate-700 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Team Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">{totalWins}</div>
                  <div className="text-sm text-slate-400">Total Wins</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{totalLosses}</div>
                  <div className="text-sm text-slate-400">Total Losses</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="font-medium">
                    {totalWins + totalLosses > 0 
                      ? `${Math.round((totalWins / (totalWins + totalLosses)) * 100)}%`
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tournament Wins</span>
                  <span className="font-medium text-yellow-400">{tournamentWins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg. Rank Points</span>
                  <span className="font-medium">{avgRankPoints}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tournaments Played</span>
                  <span className="font-medium">{tournaments.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamProfile;