import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  UserPlus, 
  UserMinus, 
  Shield, 
  Activity,
  Search,
  RefreshCw,
  AlertTriangle,
  Trophy,
  Clock,
  Target,
  Settings,
  Filter,
  Calendar,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TeamSessionEditor } from "./TeamSessionEditor";
import { PlayerRemovalDialog } from "./PlayerRemovalDialog";
import { PlayerAdditionDialog } from "./PlayerAdditionDialog";

interface Tournament {
  id: string;
  name: string;
  status: string;
  start_time: string | null;
  max_teams: number;
  team_count?: number;
  created_at: string;
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

const TOURNAMENT_STATUS_FILTERS = [
  { value: "all", label: "All Tournaments" },
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open Registration" },
  { value: "balancing", label: "Team Balancing" },
  { value: "live", label: "Live Tournament" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" }
];

export const TeamSessionMedicManager: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [modifications, setModifications] = useState<TeamSessionModification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  // Dialog state
  const [showRemovalDialog, setShowRemovalDialog] = useState(false);
  const [showAdditionDialog, setShowAdditionDialog] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<{ userId: string; teamId: string; tournamentId: string } | null>(null);
  const [teamToAddPlayer, setTeamToAddPlayer] = useState<{ teamId: string; tournamentId: string } | null>(null);

  // Load tournaments on mount
  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select(`
          id, name, status, start_time, max_teams, created_at,
          teams!inner(count)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const tournamentsWithCount = data?.map(t => ({
        ...t,
        team_count: t.teams?.length || 0
      })) || [];

      setTournaments(tournamentsWithCount);
    } catch (err: any) {
      console.error("Error fetching tournaments:", err);
      toast({
        title: "Error Loading Tournaments",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamsForTournament = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          id, name, status, total_rank_points, captain_id,
          team_members!inner(
            id, user_id, is_captain, joined_at,
            users!inner(
              id, discord_username, current_rank, riot_id, rank_points,
              wins, losses, tournaments_won, weight_rating,
              manual_weight_override, use_manual_override
            )
          )
        `)
        .eq("tournament_id", tournamentId)
        .order("name");

      if (error) throw error;

      const teamsWithMembers = data?.map(team => ({
        ...team,
        members: team.team_members || []
      })) || [];

      return teamsWithMembers;
    } catch (err: any) {
      console.error("Error fetching teams:", err);
      toast({
        title: "Error Loading Teams",
        description: err.message,
        variant: "destructive"
      });
      return [];
    }
  };

  const fetchModifications = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase
        .from("team_session_modifications")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error("Error fetching modifications:", err);
      return [];
    }
  };

  const handleTournamentSelect = async (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    setSelectedTournament(tournament);
    setLoading(true);
    
    try {
      const [teamsData, modificationsData] = await Promise.all([
        fetchTeamsForTournament(tournamentId),
        fetchModifications(tournamentId)
      ]);
      
      setTeams(teamsData);
      setModifications(modificationsData);
    } finally {
      setLoading(false);
    }
  };

  const refreshTournamentData = async () => {
    if (!selectedTournament) return;
    
    setRefreshing(true);
    try {
      const [teamsData, modificationsData] = await Promise.all([
        fetchTeamsForTournament(selectedTournament.id),
        fetchModifications(selectedTournament.id)
      ]);
      
      setTeams(teamsData);
      setModifications(modificationsData);
      
      toast({
        title: "Data Refreshed",
        description: "Tournament data has been updated successfully."
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemovePlayer = (userId: string, teamId: string) => {
    if (!selectedTournament) return;
    
    setPlayerToRemove({
      userId,
      teamId,
      tournamentId: selectedTournament.id
    });
    setShowRemovalDialog(true);
  };

  const handleAddPlayer = (teamId: string) => {
    if (!selectedTournament) return;
    
    setTeamToAddPlayer({
      teamId,
      tournamentId: selectedTournament.id
    });
    setShowAdditionDialog(true);
  };

  const toggleTournamentExpansion = (tournamentId: string) => {
    const newExpanded = new Set(expandedTournaments);
    if (newExpanded.has(tournamentId)) {
      newExpanded.delete(tournamentId);
    } else {
      newExpanded.add(tournamentId);
    }
    setExpandedTournaments(newExpanded);
  };

  // Filter tournaments
  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || tournament.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": 
        return {
          gradient: "bg-gradient-to-r from-gray-600/30 to-gray-500/30",
          bg: "bg-gradient-to-br from-gray-600 to-gray-700",
          text: "text-white",
          shadow: "shadow-gray-500/25",
          badgeBg: "bg-gray-600/20",
          badgeText: "text-gray-300"
        };
      case "open": 
        return {
          gradient: "bg-gradient-to-r from-green-600/30 to-emerald-500/30",
          bg: "bg-gradient-to-br from-green-600 to-emerald-700",
          text: "text-white",
          shadow: "shadow-green-500/25",
          badgeBg: "bg-green-600/20",
          badgeText: "text-green-300"
        };
      case "balancing": 
        return {
          gradient: "bg-gradient-to-r from-yellow-600/30 to-orange-500/30",
          bg: "bg-gradient-to-br from-yellow-600 to-orange-700",
          text: "text-white",
          shadow: "shadow-yellow-500/25",
          badgeBg: "bg-yellow-600/20",
          badgeText: "text-yellow-300"
        };
      case "live": 
        return {
          gradient: "bg-gradient-to-r from-red-600/30 to-red-500/30",
          bg: "bg-gradient-to-br from-red-600 to-red-700",
          text: "text-white",
          shadow: "shadow-red-500/25",
          badgeBg: "bg-red-600/20",
          badgeText: "text-red-300"
        };
      case "completed": 
        return {
          gradient: "bg-gradient-to-r from-blue-600/30 to-indigo-500/30",
          bg: "bg-gradient-to-br from-blue-600 to-indigo-700",
          text: "text-white",
          shadow: "shadow-blue-500/25",
          badgeBg: "bg-blue-600/20",
          badgeText: "text-blue-300"
        };
      case "archived": 
        return {
          gradient: "bg-gradient-to-r from-purple-600/30 to-violet-500/30",
          bg: "bg-gradient-to-br from-purple-600 to-violet-700",
          text: "text-white",
          shadow: "shadow-purple-500/25",
          badgeBg: "bg-purple-600/20",
          badgeText: "text-purple-300"
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "draft": return "outline";
      case "open": return "secondary";
      case "balancing": return "default";
      case "live": return "destructive";
      case "completed": return "default";
      case "archived": return "outline";
      default: return "outline";
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <Card className="border">
          <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary rounded-lg">
                      <Shield className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold">
                        Team Session Medic
                      </h1>
                      <p className="text-muted-foreground">
                        Manage team rosters, player assignments, and maintain stat integrity across all tournaments
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedTournament && (
                    <Button 
                      onClick={refreshTournamentData}
                      disabled={refreshing}
                      variant="outline"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh Data
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Tournament Selection & Filters */}
        <Card className="border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-sm font-medium">Search Tournaments</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by tournament name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="All Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {TOURNAMENT_STATUS_FILTERS.map(filter => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">
                  {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''} found
                </span>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading tournaments...</span>
                </div>
              )}
            </div>

            {/* Tournament List */}
            <div className="space-y-3">
              {filteredTournaments.map(tournament => {
                const isExpanded = expandedTournaments.has(tournament.id);
                
                return (
                  <Card key={tournament.id} className="border hover:bg-muted/50 transition-colors">
                    <Collapsible>
                          <CollapsibleTrigger
                            className="w-full p-4 flex items-center justify-between hover:bg-muted/30 rounded-t-lg transition-colors"
                            onClick={() => toggleTournamentExpansion(tournament.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                                )}
                                <div className="p-2 bg-primary rounded-lg">
                                  <Trophy className="h-5 w-5 text-primary-foreground" />
                                </div>
                              </div>
                              <div className="text-left">
                                <div className="font-bold text-lg mb-1">{tournament.name}</div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Target className="h-3 w-3" />
                                    ID: {tournament.id.slice(0, 8)}...
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {tournament.team_count || 0} teams
                                  </span>
                                  {tournament.start_time && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(tournament.start_time).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={getStatusBadgeVariant(tournament.status)}>
                                {tournament.status}
                              </Badge>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTournamentSelect(tournament.id);
                                }}
                              >
                                <Zap className="h-4 w-4 mr-2" />
                                Manage Teams
                              </Button>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent className="border-t">
                            <div className="p-4 bg-muted/30">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Max Teams</div>
                                  <div className="font-bold">{tournament.max_teams}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Start Time</div>
                                  <div className="font-bold">
                                    {tournament.start_time ? new Date(tournament.start_time).toLocaleDateString() : "TBD"}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Created</div>
                                  <div className="font-bold">
                                    {new Date(tournament.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Registration</div>
                                  <div className="font-bold">{tournament.team_count || 0} registered</div>
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    );
                  })}
                </div>

            {!loading && filteredTournaments.length === 0 && (
              <div className="text-center py-12">
                <Card className="border p-8">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tournaments found</h3>
                  <p className="text-muted-foreground">Try adjusting your search criteria or create a new tournament.</p>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Tournament Team Management */}
        {selectedTournament && (
          <TeamSessionEditor
            tournament={selectedTournament}
            teams={teams}
            modifications={modifications}
            loading={loading}
            onRemovePlayer={handleRemovePlayer}
            onAddPlayer={handleAddPlayer}
            onRefresh={refreshTournamentData}
          />
        )}

        {/* Player Removal Dialog */}
        <PlayerRemovalDialog
          open={showRemovalDialog}
          onOpenChange={setShowRemovalDialog}
          playerToRemove={playerToRemove}
          onSuccess={refreshTournamentData}
        />

        {/* Player Addition Dialog */}
        <PlayerAdditionDialog
          open={showAdditionDialog}
          onOpenChange={setShowAdditionDialog}
          teamToAddPlayer={teamToAddPlayer}
          onSuccess={refreshTournamentData}
        />
      </div>
    </div>
  );
};