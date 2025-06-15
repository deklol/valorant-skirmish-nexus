import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TournamentMedicStatusTab from "./tournament-medic/TournamentMedicStatusTab";
import TournamentMedicPlayersTab from "./tournament-medic/TournamentMedicPlayersTab";
import TournamentMedicTeamsTab from "./tournament-medic/TournamentMedicTeamsTab";
import TournamentMedicBracketTab from "./tournament-medic/TournamentMedicBracketTab";
import TournamentMedicToolsTab from "./tournament-medic/TournamentMedicToolsTab";

// Change Tournament type to match other files (status: string)
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
  tournament: tournamentInit,
  onClose,
}: {
  tournament: Tournament;
  onClose: () => void;
}) {
  const [tournament, setTournament] = useState(tournamentInit);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleRefresh() {
    setRefreshTrigger(x => x + 1);
  }
  function handleUpdate(update: Partial<Tournament>) {
    setTournament(prev => ({ ...prev, ...update }));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-lg shadow-lg border border-yellow-700 w-full max-w-4xl p-6 animate-scale-in overflow-y-auto h-[90vh]">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-lg text-white">Tournament Medic Tool</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold text-sm text-yellow-200">{tournament.name}</span>
          <span className="text-xs text-slate-400 ml-2">
            ID: <span className="font-mono">{tournament.id}</span>
          </span>
          <span className="text-xs text-slate-400 ml-2">
            Status: <Badge className="bg-yellow-800/60">{tournament.status}</Badge>
          </span>
        </div>
        <Tabs defaultValue="status" className="mt-3 w-full">
          <TabsList className="bg-slate-800 border-slate-700 mb-4 w-full flex">
            <TabsTrigger value="status" className="flex-1">Status</TabsTrigger>
            <TabsTrigger value="players" className="flex-1">Players</TabsTrigger>
            <TabsTrigger value="teams" className="flex-1">Teams</TabsTrigger>
            <TabsTrigger value="bracket" className="flex-1">Bracket</TabsTrigger>
            <TabsTrigger value="tools" className="flex-1">Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="status">
            <TournamentMedicStatusTab tournament={tournament} onUpdate={handleUpdate} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="players">
            <TournamentMedicPlayersTab tournament={tournament} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="teams">
            <TournamentMedicTeamsTab tournament={tournament} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="bracket">
            <TournamentMedicBracketTab tournament={tournament} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="tools">
            <TournamentMedicToolsTab tournament={tournament} onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>
        <div className="flex gap-2 mt-6 justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
