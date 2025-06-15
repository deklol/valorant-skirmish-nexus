
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TournamentMedicStatusTab from "./tournament-medic/TournamentMedicStatusTab";
import TournamentMedicPlayersTab from "./tournament-medic/TournamentMedicPlayersTab";
import TournamentMedicTeamsTab from "./tournament-medic/TournamentMedicTeamsTab";
import TournamentMedicBracketTab from "./tournament-medic/TournamentMedicBracketTab";
import TournamentMedicToolsTab from "./tournament-medic/TournamentMedicToolsTab";
import { Tournament } from "@/components/ComprehensiveTournamentEditor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  // Force Ready Up (set to "live" and update Supabase)
  async function handleForceReadyUp() {
    setDetailsLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          status: "live",
          updated_at: new Date().toISOString()
        })
        .eq('id', tournament.id);

      if (error) throw error;

      setTournament(prev => ({ ...prev, status: "live" }));
      toast({
        title: "Tournament Forced Live",
        description: "The tournament is now 'live'.",
      });
      setDetailsForm(prev => ({ ...prev, status: "live"}));
    } catch (error: any) {
      console.error('Error forcing ready up:', error);
      toast({
        title: "Error",
        description: error.message || "Could not set tournament to live",
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
            {/* Details edit form */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Label className="uppercase text-xs text-yellow-200 tracking-wider">
                  Tournament Details
                </Label>
              </div>
              {!editingDetails ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Name</Label>
                      <div className="text-white">{tournament.name}</div>
                    </div>
                    <div>
                      <Label className="text-slate-400">Status</Label>
                      <div className="text-white">{tournament.status}</div>
                    </div>
                    <div>
                      <Label className="text-slate-400">Start Time</Label>
                      <div className="text-white">{tournament.start_time ? new Date(tournament.start_time).toLocaleString() : '—'}</div>
                    </div>
                    <div>
                      <Label className="text-slate-400">Prize Pool</Label>
                      <div className="text-white">{tournament.prize_pool || "—"}</div>
                    </div>
                    <div>
                      <Label className="text-slate-400">Registration Opens</Label>
                      <div className="text-white">{tournament.registration_opens_at ? new Date(tournament.registration_opens_at).toLocaleString() : "—"}</div>
                    </div>
                    <div>
                      <Label className="text-slate-400">Registration Closes</Label>
                      <div className="text-white">{tournament.registration_closes_at ? new Date(tournament.registration_closes_at).toLocaleString() : "—"}</div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-400">Description</Label>
                    <div className="text-white">{tournament.description || "No description"}</div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => setEditingDetails(true)}>
                      <Save className="w-4 h-4 mr-1" /> Edit Details
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-700 text-white"
                      disabled={detailsLoading || tournament.status === "live"}
                      onClick={handleForceReadyUp}
                    >
                      <CheckSquare className="w-4 h-4 mr-1" />
                      {detailsLoading ? "Processing..." : "Force Ready Up"}
                    </Button>
                  </div>
                </>
              ) : (
                <form
                  className="space-y-6"
                  onSubmit={e => {
                    e.preventDefault();
                    handleSaveDetails();
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tm-name" className="text-slate-300">Tournament Name</Label>
                      <Input
                        id="tm-name"
                        value={detailsForm.name}
                        onChange={e => setDetailsForm(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tm-status" className="text-slate-300">Status</Label>
                      <Select
                        value={detailsForm.status}
                        onValueChange={(value: "draft" | "open" | "balancing" | "live" | "completed" | "archived") =>
                          setDetailsForm(prev => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="balancing">Balancing</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tm-description" className="text-slate-300">Description</Label>
                    <Textarea
                      id="tm-description"
                      value={detailsForm.description}
                      onChange={e => setDetailsForm(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tm-start_time" className="text-slate-300">Start Time</Label>
                      <Input
                        id="tm-start_time"
                        type="datetime-local"
                        value={detailsForm.start_time}
                        onChange={e => setDetailsForm(prev => ({ ...prev, start_time: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tm-registration_opens_at" className="text-slate-300">Registration Opens</Label>
                      <Input
                        id="tm-registration_opens_at"
                        type="datetime-local"
                        value={detailsForm.registration_opens_at}
                        onChange={e => setDetailsForm(prev => ({ ...prev, registration_opens_at: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tm-registration_closes_at" className="text-slate-300">Registration Closes</Label>
                      <Input
                        id="tm-registration_closes_at"
                        type="datetime-local"
                        value={detailsForm.registration_closes_at}
                        onChange={e => setDetailsForm(prev => ({ ...prev, registration_closes_at: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tm-check_in_starts_at" className="text-slate-300">Check-in Starts</Label>
                      <Input
                        id="tm-check_in_starts_at"
                        type="datetime-local"
                        value={detailsForm.check_in_starts_at}
                        onChange={e => setDetailsForm(prev => ({ ...prev, check_in_starts_at: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tm-check_in_ends_at" className="text-slate-300">Check-in Ends</Label>
                      <Input
                        id="tm-check_in_ends_at"
                        type="datetime-local"
                        value={detailsForm.check_in_ends_at}
                        onChange={e => setDetailsForm(prev => ({ ...prev, check_in_ends_at: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tm-prize_pool" className="text-slate-300">Prize Pool</Label>
                      <Input
                        id="tm-prize_pool"
                        value={detailsForm.prize_pool}
                        onChange={e => setDetailsForm(prev => ({ ...prev, prize_pool: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="e.g., $500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tm-max_teams" className="text-slate-300">Max Teams</Label>
                      <Input
                        id="tm-max_teams"
                        type="number"
                        min={2}
                        value={detailsForm.max_teams}
                        onChange={e => setDetailsForm(prev => ({ ...prev, max_teams: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tm-max_players" className="text-slate-300">Max Players</Label>
                      <Input
                        id="tm-max_players"
                        type="number"
                        min={2}
                        value={detailsForm.max_players}
                        onChange={e => setDetailsForm(prev => ({ ...prev, max_players: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tm-team_size" className="text-slate-300">Team Size</Label>
                      <Input
                        id="tm-team_size"
                        type="number"
                        min={1}
                        value={detailsForm.team_size}
                        onChange={e => setDetailsForm(prev => ({ ...prev, team_size: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tm-match_format" className="text-slate-300">Match Format</Label>
                      <Select
                        value={detailsForm.match_format}
                        onValueChange={(value: "BO1" | "BO3" | "BO5") =>
                          setDetailsForm(prev => ({ ...prev, match_format: value }))
                        }
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="BO1">Best of 1</SelectItem>
                          <SelectItem value="BO3">Best of 3</SelectItem>
                          <SelectItem value="BO5">Best of 5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tm-bracket_type" className="text-slate-300">Bracket Type</Label>
                      <Select
                        value={detailsForm.bracket_type}
                        onValueChange={value =>
                          setDetailsForm(prev => ({ ...prev, bracket_type: value }))
                        }
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="single_elimination">Single Elimination</SelectItem>
                          <SelectItem value="double_elimination">Double Elimination</SelectItem>
                          <SelectItem value="round_robin">Round Robin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      type="submit"
                      disabled={detailsLoading}
                      className="bg-yellow-600 text-white"
                    >
                      {detailsLoading ? "Saving..." : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingDetails(false);
                        setDetailsForm({
                          name: tournament.name,
                          description: tournament.description || '',
                          start_time: tournament.start_time ? new Date(tournament.start_time).toISOString().slice(0, 16) : '',
                          registration_opens_at: tournament.registration_opens_at ? new Date(tournament.registration_opens_at).toISOString().slice(0, 16) : '',
                          registration_closes_at: tournament.registration_closes_at ? new Date(tournament.registration_closes_at).toISOString().slice(0, 16) : '',
                          check_in_starts_at: tournament.check_in_starts_at ? new Date(tournament.check_in_starts_at).toISOString().slice(0, 16) : '',
                          check_in_ends_at: tournament.check_in_ends_at ? new Date(tournament.check_in_ends_at).toISOString().slice(0, 16) : '',
                          prize_pool: tournament.prize_pool || '',
                          status: tournament.status,
                          match_format: tournament.match_format,
                          bracket_type: tournament.bracket_type || 'single_elimination',
                          max_teams: tournament.max_teams.toString(),
                          max_players: tournament.max_players.toString(),
                          team_size: tournament.team_size.toString(),
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
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
        <div className="flex gap-2 mt-6 justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
