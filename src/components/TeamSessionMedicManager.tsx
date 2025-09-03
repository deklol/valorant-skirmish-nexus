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
  Target
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
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-red-400" />
              <div>
                <CardTitle className="text-white">Team Session Medic</CardTitle>
                <p className="text-slate-400 text-sm mt-1">
                  Manage team rosters, player assignments, and maintain stat integrity across all tournaments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedTournament && (
                <Button 
                  onClick={refreshTournamentData}
                  disabled={refreshing}
                  size="sm"
                  variant="outline"
                  className="text-slate-300 border-slate-600"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tournament Selection & Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Search Tournaments</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by tournament name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Filter by Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {TOURNAMENT_STATUS_FILTERS.map(filter => (
                    <SelectItem key={filter.value} value={filter.value} className="text-white">
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Tournament Sessions</label>
              <div className="text-slate-400 text-sm">
                {filteredTournaments.length} tournaments found
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400 mr-2" />
              <span className="text-slate-400">Loading tournaments...</span>
            </div>
          )}

          {/* Tournament List */}
          <div className="space-y-3">
            {filteredTournaments.map(tournament => (
              <Collapsible key={tournament.id}>
                <div className="border border-slate-600 rounded-lg bg-slate-750">
                  <CollapsibleTrigger
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700 rounded-lg transition-colors"
                    onClick={() => toggleTournamentExpansion(tournament.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedTournaments.has(tournament.id) ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <Trophy className="h-4 w-4 text-blue-400" />
                      <div className="text-left">
                        <div className="font-medium text-white">{tournament.name}</div>
                        <div className="text-sm text-slate-400">
                          ID: {tournament.id.slice(0, 8)}... • {tournament.team_count || 0} teams
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(tournament.status)} className="text-xs">
                        {tournament.status}
                      </Badge>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTournamentSelect(tournament.id);
                        }}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Manage Teams
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-3 pt-0 border-t border-slate-600 mt-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Max Teams:</span>
                          <div className="text-white">{tournament.max_teams}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Start Time:</span>
                          <div className="text-white">
                            {tournament.start_time ? new Date(tournament.start_time).toLocaleDateString() : "TBD"}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Created:</span>
                          <div className="text-white">
                            {new Date(tournament.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Teams:</span>
                          <div className="text-white">{tournament.team_count || 0} registered</div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>

          {!loading && filteredTournaments.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No tournaments found matching your criteria
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
  );
};