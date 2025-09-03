import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Target, 
  Activity,
  AlertTriangle,
  History,
  Weight,
  Trophy,
  Clock
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  start_time: string | null;
  max_teams: number;
}

interface Team {
  id: string;
  name: string;
  status: string;
  total_rank_points: number;
  captain_id: string | null;
  members: TeamMember[];
}

interface TeamMember {
  id: string;
  user_id: string;
  is_captain: boolean;
  joined_at: string;
  users: {
    id: string;
    discord_username: string;
    current_rank: string;
    riot_id: string | null;
    rank_points: number;
    wins: number;
    losses: number;
    tournaments_won: number;
    weight_rating: number;
    manual_weight_override: number | null;
    use_manual_override: boolean;
  };
}

interface TeamSessionModification {
  id: string;
  tournament_id: string;
  team_id: string;
  admin_user_id: string;
  modification_type: string;
  affected_user_id: string;
  reason: string | null;
  original_team_weight: number | null;
  new_team_weight: number | null;
  stats_reversed: any;
  stats_applied: any;
  created_at: string;
}

interface TeamSessionEditorProps {
  tournament: Tournament;
  teams: Team[];
  modifications: TeamSessionModification[];
  loading: boolean;
  onRemovePlayer: (userId: string, teamId: string) => void;
  onAddPlayer: (teamId: string) => void;
  onRefresh: () => void;
}

export const TeamSessionEditor: React.FC<TeamSessionEditorProps> = ({
  tournament,
  teams,
  modifications,
  loading,
  onRemovePlayer,
  onAddPlayer,
  onRefresh
}) => {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleTeamExpansion = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const getTeamStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "outline";
      case "active": return "default";
      case "eliminated": return "destructive";
      case "winner": return "default";
      case "disqualified": return "destructive";
      default: return "outline";
    }
  };

  const getRankBadgeColor = (rank: string) => {
    const rankLower = rank?.toLowerCase() || "";
    if (rankLower.includes("iron")) return "bg-amber-900 text-amber-200";
    if (rankLower.includes("bronze")) return "bg-orange-900 text-orange-200";
    if (rankLower.includes("silver")) return "bg-slate-600 text-slate-200";
    if (rankLower.includes("gold")) return "bg-yellow-600 text-yellow-200";
    if (rankLower.includes("platinum")) return "bg-cyan-600 text-cyan-200";
    if (rankLower.includes("diamond")) return "bg-blue-600 text-blue-200";
    if (rankLower.includes("ascendant")) return "bg-green-600 text-green-200";
    if (rankLower.includes("immortal")) return "bg-red-600 text-red-200";
    if (rankLower.includes("radiant")) return "bg-purple-600 text-purple-200";
    return "bg-slate-600 text-slate-200";
  };

  const getPlayerWeight = (member: TeamMember) => {
    const user = member.users;
    if (user.use_manual_override && user.manual_weight_override !== null) {
      return user.manual_weight_override;
    }
    return user.rank_points || user.weight_rating || 150;
  };

  const getTeamModifications = (teamId: string) => {
    return modifications.filter(mod => mod.team_id === teamId);
  };

  const formatModificationType = (type: string) => {
    switch (type) {
      case "player_added": return { text: "Player Added", color: "text-green-400" };
      case "player_removed": return { text: "Player Removed", color: "text-red-400" };
      default: return { text: type, color: "text-slate-400" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Tournament Header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                {tournament.name}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <span>ID: {tournament.id.slice(0, 8)}...</span>
                <Badge variant={getTeamStatusBadgeVariant(tournament.status)}>
                  {tournament.status}
                </Badge>
                <span>{teams.length} teams</span>
                {tournament.start_time && (
                  <span>
                    <Clock className="inline h-4 w-4 mr-1" />
                    {new Date(tournament.start_time).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {teams.map(team => {
          const teamMods = getTeamModifications(team.id);
          const isExpanded = expandedTeams.has(team.id);
          
          return (
            <Card key={team.id} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-400" />
                    <div>
                      <CardTitle className="text-white text-lg">{team.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getTeamStatusBadgeVariant(team.status)} className="text-xs">
                          {team.status}
                        </Badge>
                        <span className="text-slate-400 text-sm">
                          <Weight className="inline h-3 w-3 mr-1" />
                          {team.total_rank_points || 0} weight
                        </span>
                        <span className="text-slate-400 text-sm">
                          {team.members.length} players
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => onAddPlayer(team.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Player
                    </Button>
                    {(teamMods.length > 0) && (
                      <Button
                        onClick={() => toggleTeamExpansion(team.id)}
                        size="sm"
                        variant="outline"
                        className="text-slate-300 border-slate-600"
                      >
                        {isExpanded ? "Hide Details" : "Show Details"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Team Members */}
                <div className="space-y-2 mb-4">
                  {team.members.map(member => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-3 bg-slate-750 rounded border border-slate-600"
                    >
                      <div className="flex items-center gap-3">
                        {member.is_captain && (
                          <Crown className="h-4 w-4 text-yellow-400" />
                        )}
                        <div>
                          <div className="font-medium text-white flex items-center gap-2">
                            {member.users.discord_username}
                            {member.is_captain && (
                              <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400">
                                Captain
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-400">
                            {member.users.riot_id || "No Riot ID"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right text-sm">
                          <Badge className={`text-xs ${getRankBadgeColor(member.users.current_rank)}`}>
                            {member.users.current_rank || "Unranked"}
                          </Badge>
                          <div className="text-slate-400 mt-1">
                            Weight: {getPlayerWeight(member)}
                          </div>
                        </div>
                        
                        <div className="text-right text-xs text-slate-400">
                          <div>W: {member.users.wins || 0} L: {member.users.losses || 0}</div>
                          <div>Tournaments: {member.users.tournaments_won || 0}</div>
                        </div>
                        
                        <Button
                          onClick={() => onRemovePlayer(member.users.id, team.id)}
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Team Modifications History */}
                {isExpanded && teamMods.length > 0 && (
                  <>
                    <Separator className="bg-slate-600 my-4" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        <History className="h-4 w-4" />
                        Recent Modifications ({teamMods.length})
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {teamMods.slice(0, 5).map(mod => {
                          const modType = formatModificationType(mod.modification_type);
                          return (
                            <div key={mod.id} className="flex items-center justify-between p-2 bg-slate-700 rounded text-xs">
                              <div className="flex items-center gap-2">
                                <Activity className={`h-3 w-3 ${modType.color}`} />
                                <span className={modType.color}>{modType.text}</span>
                                {mod.reason && (
                                  <span className="text-slate-400">- {mod.reason}</span>
                                )}
                              </div>
                              <div className="text-slate-400">
                                {new Date(mod.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
                
                {/* Team Statistics */}
                {isExpanded && (
                  <>
                    <Separator className="bg-slate-600 my-4" />
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-slate-400">Team Weight</div>
                        <div className="text-white font-medium">{team.total_rank_points || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400">Members</div>
                        <div className="text-white font-medium">{team.members.length}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400">Status</div>
                        <Badge variant={getTeamStatusBadgeVariant(team.status)} className="text-xs">
                          {team.status}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {teams.length === 0 && !loading && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No teams found</p>
            <p className="text-slate-500 text-sm mt-2">
              This tournament doesn't have any teams yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tournament Modifications Summary */}
      {modifications.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-purple-400" />
              Tournament Modification History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {modifications.slice(0, 10).map(mod => {
                const team = teams.find(t => t.id === mod.team_id);
                const modType = formatModificationType(mod.modification_type);
                
                return (
                  <div key={mod.id} className="flex items-center justify-between p-3 bg-slate-750 rounded border border-slate-600">
                    <div className="flex items-center gap-3">
                      <Activity className={`h-4 w-4 ${modType.color}`} />
                      <div>
                        <div className="text-white font-medium">
                          {modType.text} - {team?.name || "Unknown Team"}
                        </div>
                        <div className="text-slate-400 text-sm">
                          {mod.reason || "No reason provided"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{new Date(mod.created_at).toLocaleDateString()}</div>
                      {mod.original_team_weight !== null && mod.new_team_weight !== null && (
                        <div className="text-xs">
                          Weight: {mod.original_team_weight} → {mod.new_team_weight}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};