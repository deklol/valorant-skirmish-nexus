
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

type Tournament = {
  id: string;
  name: string;
  status: string;
  match_format: string | null;
  team_size: number | null;
  max_teams: number | null;
  max_players: number | null;
  prize_pool: string | null;
  start_time: string | null;
  created_at: string | null;
};

export default function TournamentMedicEditModal({
  tournament,
  onClose,
}: {
  tournament: Tournament;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-lg shadow-lg border border-yellow-700 w-full max-w-xl p-6 animate-scale-in">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-lg text-white">Tournament Medic Tool</span>
        </div>
        <div className="mb-4">
          <div className="font-semibold text-sm text-yellow-200 mb-1">
            {tournament.name}
          </div>
          <div className="text-xs text-slate-400">
            ID: <span className="font-mono">{tournament.id}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Status: <Badge className="bg-yellow-800/60">{tournament.status}</Badge>
          </div>
        </div>
        <div className="py-2 text-slate-300 text-xs">
          {/* Emergency admin controls for the tournament go here! */}
          <div className="italic">Comprehensive emergency tools for tournament management coming soon.</div>
        </div>
        <div className="flex gap-2 mt-6 justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
