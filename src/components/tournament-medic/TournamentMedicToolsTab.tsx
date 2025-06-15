
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

// Returns problems or [] if ok
async function doHealthCheck(tournamentId: string): Promise<string[]> {
  const problems: string[] = [];

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
}

export default function TournamentMedicToolsTab({ tournament, onRefresh }: {
  tournament: { id: string };
  onRefresh: () => void;
}) {
  const [running, setRunning] = useState(false);

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

  return (
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
      <Button size="sm" variant="outline" onClick={() => toast({
        title: "Emergency Announcement",
        description: "This will broadcast to all participants. (Not implemented yet.)"
      })}>Send Tournament Announcement</Button>
    </div>
  );
}
