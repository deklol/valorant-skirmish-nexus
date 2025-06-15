import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import ComprehensiveTournamentEditor from "@/components/ComprehensiveTournamentEditor";
import { Tournament } from "@/types/tournament";
import TournamentStatusManager from "@/components/TournamentStatusManager";
import MedicTournamentTimeline from "./MedicTournamentTimeline";

// Use the Tournament type exported from ComprehensiveTournamentEditor

export default function TournamentMedicStatusTab({
  tournament,
  onUpdate,
  onRefresh,
}: {
  tournament: Tournament;
  onUpdate: (update: Partial<Tournament>) => void;
  onRefresh: () => void;
}) {
  // Removed showEditor and advanced editor logic

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
        </CardContent>
      </Card>
      {/* Timeline */}
      <MedicTournamentTimeline tournament={tournament} />
    </div>
  );
}
