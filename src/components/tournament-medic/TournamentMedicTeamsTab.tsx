import {
  CheckCircled,
  Copy,
  ChevronsUpDown,
  Import,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import TeamBalancingInterface from "@/components/TeamBalancingInterface";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Tournament } from "@/types/tournament";

export default function TournamentMedicTeamsTab({
  tournament,
  onRefresh,
}: {
  tournament: Tournament,
  onRefresh: () => void
}) {
  // By default, show team builder instead of quick actions
  const [activeSection, setActiveSection] = useState<'team_builder' | 'quick_actions'>('team_builder');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1 rounded ${activeSection === 'team_builder' ? 'bg-yellow-700 text-white' : 'bg-slate-800 text-slate-300'}`}
          onClick={() => setActiveSection('team_builder')}
        >
          Team Builder
        </button>
        <button
          className={`px-3 py-1 rounded ${activeSection === 'quick_actions' ? 'bg-yellow-700 text-white' : 'bg-slate-800 text-slate-300'}`}
          onClick={() => setActiveSection('quick_actions')}
        >
          Quick Actions
        </button>
      </div>
      {activeSection === 'team_builder' && (
        <TeamBalancingInterface
          tournamentId={tournament.id}
          maxTeams={tournament.max_teams}
          teamSize={tournament.team_size}
          onTeamsUpdated={onRefresh}
        />
      )}
      {activeSection === 'quick_actions' && (
        <div>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Copy Team List
              </Button>
              <Button variant="outline" className="w-full">
                <Import className="w-4 h-4 mr-2" />
                Import Teams from CSV
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Team Actions</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Captain</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Team 1</TableCell>
                    <TableCell>Player 1</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Team 2</TableCell>
                    <TableCell>Player 2</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
