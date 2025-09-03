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
  Clock,
  Zap,
  Gamepad2,
  Star,
  Award
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

  const getTeamStatusColor = (status: string) => {
    switch (status) {
      case "pending": 
        return {
          gradient: "bg-gradient-to-r from-yellow-600/30 to-orange-500/30",
          bg: "bg-gradient-to-br from-yellow-600 to-orange-700",
          text: "text-white",
          shadow: "shadow-yellow-500/25",
          badgeBg: "bg-yellow-600/20",
          badgeText: "text-yellow-300"
        };
      case "active": 
        return {
          gradient: "bg-gradient-to-r from-green-600/30 to-emerald-500/30",
          bg: "bg-gradient-to-br from-green-600 to-emerald-700",
          text: "text-white",
          shadow: "shadow-green-500/25",
          badgeBg: "bg-green-600/20",
          badgeText: "text-green-300"
        };
      case "eliminated": 
        return {
          gradient: "bg-gradient-to-r from-red-600/30 to-red-500/30",
          bg: "bg-gradient-to-br from-red-600 to-red-700",
          text: "text-white",
          shadow: "shadow-red-500/25",
          badgeBg: "bg-red-600/20",
          badgeText: "text-red-300"
        };
      case "winner": 
        return {
          gradient: "bg-gradient-to-r from-purple-600/30 to-violet-500/30",
          bg: "bg-gradient-to-br from-purple-600 to-violet-700",
          text: "text-white",
          shadow: "shadow-purple-500/25",
          badgeBg: "bg-purple-600/20",
          badgeText: "text-purple-300"
        };
      case "disqualified": 
        return {
          gradient: "bg-gradient-to-r from-gray-600/30 to-gray-500/30",
          bg: "bg-gradient-to-br from-gray-600 to-gray-700",
          text: "text-white",
          shadow: "shadow-gray-500/25",
          badgeBg: "bg-gray-600/20",
          badgeText: "text-gray-300"
        };
      default: 
        return {
          gradient: "bg-gradient-to-r from-slate-600/30 to-slate-500/30",
          bg: "bg-gradient-to-br from-slate-600 to-slate-700",
          text: "text-white",
          shadow: "shadow-slate-500/25",
          badgeBg: "bg-slate-600/20",
          badgeText: "text-slate-300"
        };
    }
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
      <Card className="border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary rounded-lg">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {tournament.name}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground text-sm">
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    ID: {tournament.id.slice(0, 8)}...
                  </span>
                  <Badge variant="secondary">
                    {tournament.status}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {teams.length} teams
                  </span>
                  {tournament.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(tournament.start_time).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {teams.map(team => {
          const teamMods = getTeamModifications(team.id);
          const isExpanded = expandedTeams.has(team.id);
          
          return (
            <Card key={team.id} className="border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary rounded-lg">
                      <Users className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{team.name}</CardTitle>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant={getTeamStatusBadgeVariant(team.status)} className="text-xs">
                          {team.status}
                        </Badge>
                        <span className="text-muted-foreground text-sm flex items-center gap-1">
                          <Weight className="h-3 w-3" />
                          {team.total_rank_points || 0} weight
                        </span>
                        <span className="text-muted-foreground text-sm flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {team.members.length} players
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => onAddPlayer(team.id)}
                      size="sm"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Player
                    </Button>
                    {(teamMods.length > 0) && (
                      <Button
                        onClick={() => toggleTeamExpansion(team.id)}
                        size="sm"
                        variant="outline"
                      >
                        <History className="h-4 w-4 mr-1" />
                        {isExpanded ? "Hide" : "Show"} Details
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
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {member.is_captain && (
                          <div className="p-2 bg-primary rounded-lg">
                            <Crown className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{member.users.discord_username}</span>
                            {member.is_captain && (
                              <Badge variant="outline" className="text-xs">
                                Captain
                              </Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground text-sm">
                            {member.users.riot_id || "No Riot ID"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge className={`text-xs font-medium ${getRankBadgeColor(member.users.current_rank)}`}>
                            {member.users.current_rank || "Unranked"}
                          </Badge>
                          <div className="text-muted-foreground mt-1 text-sm">
                            Weight: <span className="font-medium">{getPlayerWeight(member)}</span>
                          </div>
                        </div>
                        
                        <div className="text-right text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Gamepad2 className="h-3 w-3" />
                            <span>W: {member.users.wins || 0} L: {member.users.losses || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="h-3 w-3" />
                            <span>Tournaments: {member.users.tournaments_won || 0}</span>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => onRemovePlayer(member.users.id, team.id)}
                          size="sm"
                          variant="destructive"
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
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-lg">
                          <History className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Recent Modifications</h4>
                          <p className="text-muted-foreground text-sm">{teamMods.length} modification{teamMods.length !== 1 ? 's' : ''} recorded</p>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {teamMods.slice(0, 5).map(mod => {
                          const modType = formatModificationType(mod.modification_type);
                          return (
                            <div key={mod.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Activity className={`h-4 w-4 ${modType.color}`} />
                                <div>
                                  <span className={`font-medium ${modType.color}`}>{modType.text}</span>
                                  {mod.reason && (
                                    <div className="text-muted-foreground text-sm mt-1">{mod.reason}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
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
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-muted-foreground text-sm font-medium mb-1">Team Weight</div>
                        <div className="font-bold text-xl">{team.total_rank_points || 0}</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-muted-foreground text-sm font-medium mb-1">Members</div>
                        <div className="font-bold text-xl">{team.members.length}</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-muted-foreground text-sm font-medium mb-1">Status</div>
                        <Badge variant={getTeamStatusBadgeVariant(team.status)} className="font-bold">
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
        <div className="text-center py-12">
          <Card className="border p-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-3">No teams found</h3>
            <p className="text-muted-foreground">
              This tournament doesn't have any teams yet.
            </p>
          </Card>
        </div>
      )}

      {/* Tournament Modifications Summary */}
      {modifications.length > 0 && (
        <Card className="border">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <History className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Tournament Modification History</CardTitle>
                <p className="text-muted-foreground text-sm">Complete audit trail of all team modifications</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {modifications.slice(0, 10).map(mod => {
                const team = teams.find(t => t.id === mod.team_id);
                const modType = formatModificationType(mod.modification_type);
                
                return (
                  <div key={mod.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${modType.color === 'text-green-400' ? 'bg-green-600/20' : 'bg-red-600/20'} rounded-lg`}>
                        <Activity className={`h-4 w-4 ${modType.color}`} />
                      </div>
                      <div>
                        <div className="font-semibold">
                          {modType.text} - {team?.name || "Unknown Team"}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {mod.reason || "No reason provided"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{new Date(mod.created_at).toLocaleDateString()}</div>
                      {mod.original_team_weight !== null && mod.new_team_weight !== null && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Weight: <span className="text-destructive">{mod.original_team_weight}</span> → <span className="text-green-600">{mod.new_team_weight}</span>
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