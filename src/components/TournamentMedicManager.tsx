import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Wrench } from "lucide-react";

type Tournament = {
  id: string;
  name: string;
  status: string;
};

const TournamentMedicManager = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error", description: "Failed to fetch tournaments", variant: "destructive" });
        setTournaments([]);
      } else {
        setTournaments(data || []);
      }
    };
    fetchTournaments();
  }, [toast]);

  const handleForceOpenRegistration = async () => {
    if (!selectedTournamentId) return;
    setLoading(true);
    const { error } = await supabase
      .from("tournaments")
      .update({ status: "open" })
      .eq("id", selectedTournamentId);

    setLoading(false);
    if (error) {
      toast({ title: "Failed", description: "Could not force open registration", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Registration forcibly opened!" });
    }
  };

  const selectDisabled = tournaments.length === 0;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center gap-3">
        <Wrench className="w-5 h-5 text-yellow-500" />
        <CardTitle className="text-white text-lg">Tournament Medic (Emergency Tools)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <label className="text-slate-400 block mb-1">Select Tournament</label>
          <Select
            value={selectedTournamentId || ""}
            onValueChange={setSelectedTournamentId}
            disabled={selectDisabled}
          >
            <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Choose a tournament..." />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectDisabled && (
            <div className="mt-2 text-sm text-slate-400">No tournaments found.</div>
          )}
        </div>

        {selectedTournamentId && tournaments.length > 0 && (
          <div className="space-y-3">
            <Button
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              disabled={loading}
              onClick={handleForceOpenRegistration}
            >
              Force Open Registration
            </Button>
            <div className="text-xs text-slate-400">
              More emergency tools coming soon.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentMedicManager;
