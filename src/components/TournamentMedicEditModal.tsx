import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckSquare, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TournamentMedicStatusTab from "./tournament-medic/TournamentMedicStatusTab";
import TournamentMedicPlayersTab from "./tournament-medic/TournamentMedicPlayersTab";
import TournamentMedicTeamsTab from "./tournament-medic/TournamentMedicTeamsTab";
import TournamentMedicBracketTab from "./tournament-medic/TournamentMedicBracketTab";
import TournamentMedicToolsTab from "./tournament-medic/TournamentMedicToolsTab";
import { Tournament } from "@/types/tournament";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ComprehensiveTournamentEditor from "@/components/ComprehensiveTournamentEditor";

// Remove local Tournament type -- use the imported one everywhere.

export default function TournamentMedicEditModal({
  tournament: tournamentInit,
  onClose,
}: {
  tournament: Tournament;
  onClose: () => void;
}) {
  // Ensure we always have a bracket_type, even if null, to avoid missing required prop
  const normalizedTournament = {
    ...tournamentInit,
    bracket_type: tournamentInit.bracket_type ?? null,
  };
  const [tournament, setTournament] = useState<Tournament>(normalizedTournament);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- Details Edit State
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    name: tournament.name,
    description: tournament.description || '',
    start_time: tournament.start_time ? new Date(tournament.start_time).toISOString().slice(0, 16) : '',
    registration_opens_at: tournament.registration_opens_at ? new Date(tournament.registration_opens_at).toISOString().slice(0, 16) : '',
    registration_closes_at: tournament.registration_closes_at ? new Date(tournament.registration_closes_at).toISOString().slice(0, 16) : '',
    check_in_starts_at: tournament.check_in_starts_at ? new Date(tournament.check_in_starts_at).toISOString().slice(0, 16) : '',
    check_in_ends_at: tournament.check_in_ends_at ? new Date(tournament.check_in_ends_at).toISOString().slice(0, 16) : '',
    prize_pool: tournament.prize_pool || '',
    status: tournament.status as "draft" | "open" | "balancing" | "live" | "completed" | "archived",
    match_format: (tournament.match_format || 'BO1') as "BO1" | "BO3" | "BO5",
    bracket_type: tournament.bracket_type || 'single_elimination',
    max_teams: tournament.max_teams.toString(),
    max_players: tournament.max_players.toString(),
    team_size: tournament.team_size.toString()
  });
  const { toast } = useToast();

  // Save details
  async function handleSaveDetails() {
    setDetailsLoading(true);
    try {
      const updateData = {
        name: detailsForm.name,
        description: detailsForm.description || null,
        start_time: detailsForm.start_time ? new Date(detailsForm.start_time).toISOString() : null,
        registration_opens_at: detailsForm.registration_opens_at ? new Date(detailsForm.registration_opens_at).toISOString() : null,
        registration_closes_at: detailsForm.registration_closes_at ? new Date(detailsForm.registration_closes_at).toISOString() : null,
        check_in_starts_at: detailsForm.check_in_starts_at ? new Date(detailsForm.check_in_starts_at).toISOString() : null,
        check_in_ends_at: detailsForm.check_in_ends_at ? new Date(detailsForm.check_in_ends_at).toISOString() : null,
        prize_pool: detailsForm.prize_pool || null,
        status: detailsForm.status,
        match_format: detailsForm.match_format,
        bracket_type: detailsForm.bracket_type,
        max_teams: parseInt(detailsForm.max_teams),
        max_players: parseInt(detailsForm.max_players),
        team_size: parseInt(detailsForm.team_size),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: "Tournament Updated",
        description: "Tournament details successfully updated.",
      });

      setEditingDetails(false);
      setTournament(prev => ({...prev, ...updateData}));
      setRefreshTrigger(x => x + 1);
    } catch (error: any) {
      console.error('Error updating tournament:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tournament",
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  }

  function handleRefresh() {
    setRefreshTrigger(x => x + 1);
  }
  function handleUpdate(update: Partial<Tournament>) {
    setTournament(prev => ({
      ...prev,
      ...update,
      bracket_type: (update.bracket_type !== undefined ? update.bracket_type : prev.bracket_type) ?? null,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-lg shadow-lg border border-yellow-700 w-full max-w-4xl p-6 animate-scale-in overflow-y-auto h-[90vh] relative">
        {/* Close modal button - Top Right */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

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
        <Tabs defaultValue="teams" className="mt-3 w-full">
          <TabsList className="bg-slate-800 border-slate-700 mb-4 w-full flex">
            <TabsTrigger value="status" className="flex-1">Status</TabsTrigger>
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="players" className="flex-1">Players</TabsTrigger>
            <TabsTrigger value="teams" className="flex-1">Teams</TabsTrigger>
            <TabsTrigger value="bracket" className="flex-1">Bracket</TabsTrigger>
            <TabsTrigger value="tools" className="flex-1">Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="status">
            <TournamentMedicStatusTab tournament={tournament} onUpdate={handleUpdate} onRefresh={handleRefresh} />
          </TabsContent>
          <TabsContent value="details">
            <div className="space-y-4">
              <ComprehensiveTournamentEditor
                tournament={tournament}
                onTournamentUpdated={() => {
                  setRefreshTrigger(x => x + 1);
                }}
              />
            </div>
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
        {/* Remove the old bottom "Close" button */}
      </div>
    </div>
  );
}
