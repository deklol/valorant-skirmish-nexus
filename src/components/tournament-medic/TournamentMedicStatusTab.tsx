
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Calendar } from "lucide-react";
import ComprehensiveTournamentEditor, {
  Tournament as ComprehensiveTournamentType,
} from "@/components/ComprehensiveTournamentEditor";
import TournamentStatusManager from "@/components/TournamentStatusManager";
import MedicTournamentTimeline from "./MedicTournamentTimeline";

// Use the Tournament type from ComprehensiveTournamentEditor
type Tournament = ComprehensiveTournamentType;

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
