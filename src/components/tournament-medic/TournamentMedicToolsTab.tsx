
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { completeTournament } from "@/utils/completeTournament";
import TournamentWinnerDisplay from "@/components/TournamentWinnerDisplay";
import TournamentDeletionTool from "./TournamentDeletionTool";
import TournamentHealthDashboard from "./TournamentHealthDashboard";
import TeamCleanupTools from "@/components/team-balancing/TeamCleanupTools";
import TeamManagementTools from "@/components/bracket-medic/TeamManagementTools";
import { logApplicationError, auditActions } from "@/utils/auditLogger";

// Returns problems or [] if ok
async function doHealthCheck(tournamentId: string): Promise<string[]> {
  const problems: string[] = [];

  try {
    // Log the health check action
    await auditActions.adminPageAccess(`tournament-medic-health-check-${tournamentId}`);

    // Find signups with missing user rows
    const usersRes = await supabase
      .from("tournament_signups")
      .select("user_id")
      .eq("tournament_id", tournamentId);

    if (!usersRes.data) {
      problems.push("Could not fetch signups.");
      return problems;
    }
    const userIds = usersRes.data.map(signup => signup.user_id);

    if (userIds.length > 0) {
      const { data: usersFound } = await supabase
        .from("users")
        .select("id")
        .in("id", userIds);
      if (!usersFound || usersFound.length !== userIds.length) {
        problems.push(
          `There are ${userIds.length - (usersFound?.length || 0)} player(s) signed up with missing user records.`
        );
      }
    }

    // Check for teams without users
    const teamsRes = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", tournamentId);
    const teamIds = teamsRes.data?.map(t => t.id) || [];
    if (teamIds.length > 0) {
      const tmRes = await supabase
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds);
      const teamsWithMembers = new Set((tmRes.data || []).map(t => t.team_id));
      const teamsWithoutPlayers = teamIds.filter(id => !teamsWithMembers.has(id));
      if (teamsWithoutPlayers.length > 0) {
        problems.push(`There are ${teamsWithoutPlayers.length} team(s) in this tournament without any players.`);
      }
    }
    // Add more checks if needed
    // e.g. matches linked to teams not in this tournament

    return problems;

  } catch (error) {
    // Log the error to audit system
    await logApplicationError({
      component: 'TournamentMedicToolsTab',
      errorMessage: `Health check failed for tournament ${tournamentId}: ${error}`,
      errorCode: 'HEALTH_CHECK_FAILED',
      metadata: { tournamentId }
    });
    problems.push("Health check encountered an error. See audit logs for details.");
    return problems;
  }
}

export default function TournamentMedicToolsTab({ 
  tournament, 
  onRefresh,
  teams = [],
  matches = [],
  onTeamsUpdated 
}: {
  tournament: { id: string, status?: string, name?: string };
  onRefresh: () => void;
  teams?: Array<{
    id: string;
    name: string;
    members: Array<{ id: string; discord_username: string }>;
    totalWeight: number;
    isPlaceholder?: boolean;
  }>;
  matches?: Array<{ id: string; round_number: number; match_number: number; team1_id: string | null; team2_id: string | null; status: string }>;
  onTeamsUpdated?: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [completing, setCompleting] = useState(false);

  async function handleHealthCheck() {
    setRunning(true);
    const problems = await doHealthCheck(tournament.id);
    setRunning(false);
    if (problems.length === 0) {
      toast({
        title: "Tournament Healthcheck",
        description: "No major problems detected!"
      });
    } else {
      toast({
        title: "Tournament Healthcheck",
        description: problems.join(" | "),
        variant: "destructive"
      });
    }
  }

  async function handleCompleteTournament() {
    setCompleting(true);
    
    try {
      // Log the completion attempt
      await auditActions.adminPageAccess(`tournament-completion-${tournament.id}`);
      
      const teamsRes = await supabase.from("teams").select("id").eq("tournament_id", tournament.id).eq("status", "winner");
      let winnerId = teamsRes.data?.[0]?.id;
      if (!winnerId) {
        toast({
          title: "No Winner Set",
          description: "Set a winning team before completing tournament.",
          variant: "destructive",
        });
        
        // Log the failed completion attempt
        await logApplicationError({
          component: 'TournamentMedicToolsTab',
          errorMessage: `Tournament completion failed: No winner set for tournament ${tournament.name}`,
          errorCode: 'NO_WINNER_SET',
          metadata: { tournamentId: tournament.id, tournamentName: tournament.name }
        });
        
        setCompleting(false);
        return;
      }
      
      const success = await completeTournament(tournament.id, winnerId);
      setCompleting(false);
      
      if (success) {
        toast({ title: "Tournament Marked Complete" });
        onRefresh();
      } else {
        toast({ title: "Error", description: "Could not complete tournament", variant: "destructive" });
        
        // Log the completion failure
        await logApplicationError({
          component: 'TournamentMedicToolsTab',
          errorMessage: `Tournament completion failed for tournament ${tournament.name}`,
          errorCode: 'COMPLETION_FAILED',
          metadata: { tournamentId: tournament.id, tournamentName: tournament.name, winnerId }
        });
      }
    } catch (error) {
      setCompleting(false);
      
      // Log unexpected errors
      await logApplicationError({
        component: 'TournamentMedicToolsTab',
        errorMessage: `Unexpected error during tournament completion: ${error}`,
        errorCode: 'COMPLETION_ERROR',
        metadata: { tournamentId: tournament.id, tournamentName: tournament.name }
      });
      
      toast({ title: "Error", description: "Unexpected error during completion", variant: "destructive" });
    }
  }

  
  return (
    <div className="space-y-6">
      {/* Tournament Health Dashboard */}
      <TournamentHealthDashboard 
        tournamentId={tournament.id}
        onHealthChange={onRefresh}
      />
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold mb-2 text-yellow-200">Data Repair & Announcements:</div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleHealthCheck}
            disabled={running}
          >
            {running ? "Running..." : "Run Data Repair Scan"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            // Log the announcement attempt
            auditActions.adminPageAccess(`tournament-announcement-${tournament.id}`);
            toast({
              title: "Emergency Announcement",
              description: "This will broadcast to all participants. (Not implemented yet.)"
            });
          }}>Send Tournament Announcement</Button>
          <div className="mt-3 pt-2 border-t border-yellow-900/20 flex flex-col gap-2">
            <Button
              size="sm"
              variant="default"
              className="bg-blue-700"
              onClick={handleCompleteTournament}
              disabled={completing}
            >
              {completing ? "Completing..." : "Complete Tournament Now"}
            </Button>
            <TournamentWinnerDisplay
              tournamentId={tournament.id}
              tournamentStatus={tournament.status || ""}
            />
          </div>
        </div>

        {/* Tournament Deletion Tool */}
        <TournamentDeletionTool
          tournament={{
            id: tournament.id,
            name: tournament.name || "Unknown Tournament",
            status: (tournament.status as any) || "unknown",
            // Fill in required Tournament fields with defaults
            description: null,
            start_time: null,
            registration_opens_at: null,
            registration_closes_at: null,
            check_in_starts_at: null,
            check_in_ends_at: null,
            max_teams: 0,
            max_players: 0,
            team_size: 5,
            prize_pool: null,
            match_format: "BO1",
            bracket_type: "single_elimination",
            check_in_required: true
          }}
          onTournamentDeleted={onRefresh}
        />

        {/* Team Management Tools - moved from Bracket Medic */}
        {teams.length > 0 && matches.length > 0 && (
          <TeamManagementTools
            tournamentId={tournament.id}
            teams={teams.map(t => ({ id: t.id, name: t.name, status: 'active' }))}
            matches={matches}
            onUpdate={onRefresh}
            loading={false}
          />
        )}

        {/* Team Cleanup Tools */}
        {teams.length > 0 && onTeamsUpdated && (
          <TeamCleanupTools
            tournamentId={tournament.id}
            teams={teams}
            onTeamsUpdated={onTeamsUpdated}
          />
        )}
      </div>
    </div>
  );
}
