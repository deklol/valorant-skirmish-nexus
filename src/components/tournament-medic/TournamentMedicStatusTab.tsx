
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Calendar } from "lucide-react";
import ComprehensiveTournamentEditor from "@/components/ComprehensiveTournamentEditor";
import TournamentStatusManager from "@/components/TournamentStatusManager";
import MedicTournamentTimeline from "./MedicTournamentTimeline";

// EXTEND Tournament type to match app usage
type Tournament = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  match_format: string | null;
  team_size: number | null;
  max_teams: number | null;
  max_players: number | null;
  prize_pool: string | null;
  start_time: string | null;
  created_at: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  check_in_starts_at?: string | null;
  check_in_ends_at?: string | null;
  check_in_required?: boolean | null;
  enable_map_veto?: boolean | null;
  // Add any additional keys as needed, safe for partial typing.
};

export default function TournamentMedicStatusTab({
  tournament,
  onUpdate,
  onRefresh,
}: {
  tournament: Tournament;
  onUpdate: (update: Partial<Tournament>) => void;
  onRefresh: () => void;
}) {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Key Tournament Overview */}
      <Card className="bg-slate-800 border-yellow-800/40">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center text-yellow-300">
            <ShieldAlert className="w-5 h-5" />
            Status & Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TournamentStatusManager
            tournamentId={tournament.id}
            currentStatus={tournament.status}
            onStatusChange={onRefresh}
          />
          <button
            className="mt-4 text-xs underline text-amber-400"
            onClick={() => setShowEditor(e => !e)}
          >
            {showEditor
              ? "Hide Advanced Tournament Editor"
              : "Show Advanced Tournament Editor"}
          </button>
          {showEditor && (
            <div className="mt-2 border border-yellow-800/50 rounded p-2 bg-yellow-900/10">
              <ComprehensiveTournamentEditor
                tournament={tournament}
                onTournamentUpdated={onRefresh}
              />
            </div>
          )}
        </CardContent>
      </Card>
      {/* Timeline */}
      <MedicTournamentTimeline tournament={tournament} />
    </div>
  );
}
