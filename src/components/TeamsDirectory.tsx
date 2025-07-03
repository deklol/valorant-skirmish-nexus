import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Crown, Search, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { TeamWithMembers } from "@/types/team";

const TeamsDirectory = () => {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      // Get all active teams with their members
      const { data: teamsData, error } = await supabase
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
              rank_points
            )
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTeams = teamsData?.map(team => ({
        ...team,
        captain_id: team.persistent_team_members.find(m => m.is_captain)?.users?.id || '',
        invite_code: '', // Don't expose invite codes publicly
        members: team.persistent_team_members?.map(member => ({
          ...member,
          team_id: team.id,
          user_id: member.users.id,
        })) || [],
        member_count: team.persistent_team_members?.length || 0,
        is_user_captain: false,
        is_user_member: false,
      })) || [];

      setTeams(formattedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.members.some(member => 
      member.users.discord_username.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="h-10 bg-slate-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Teams Directory</h1>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {teams.length} Team{teams.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input
          placeholder="Search teams, descriptions, or members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-600"
        />
      </div>

      {filteredTeams.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? "No teams found" : "No teams available"}
            </h3>
            <p className="text-slate-400 mb-4">
              {searchTerm 
                ? "Try adjusting your search terms"
                : "Be the first to create a team!"
              }
            </p>
            {!searchTerm && (
              <Link to="/teams">
                <Button>Create a Team</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const captain = team.members.find(m => m.is_captain);
            
            return (
              <Card key={team.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-200 animate-fade-in hover-scale">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <Badge variant="outline">
                      {team.member_count}/{team.max_members}
                    </Badge>
                  </div>
                  {team.description && (
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {team.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Captain */}
                  {captain && (
                    <div className="flex items-center gap-2 text-sm">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="text-slate-300">
                        {captain.users.discord_username}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {captain.users.current_rank}
                      </Badge>
                    </div>
                  )}

                  {/* Members List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300">Members</h4>
                    <div className="space-y-1">
                      {team.members.slice(0, 4).map((member) => (
                        <div key={member.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-400 flex items-center gap-1">
                            {member.is_captain && <Crown className="h-3 w-3 text-yellow-500" />}
                            {member.users.discord_username}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {member.users.current_rank}
                          </Badge>
                        </div>
                      ))}
                      {team.members.length > 4 && (
                        <p className="text-xs text-slate-500">
                          +{team.members.length - 4} more member{team.members.length - 4 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Team Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created {formatDate(team.created_at)}
                    </div>
                  </div>

                  {/* View Team Button */}
                  <Link to={`/team/${team.id}`} className="block">
                    <Button variant="outline" className="w-full">
                      View Team Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamsDirectory;