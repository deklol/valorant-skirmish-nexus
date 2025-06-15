
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Tournament = {
  id: string;
  name: string;
  status: string;
  registration_closes_at?: string | null;
  start_time?: string | null;
};

export default function TournamentMedicStatusTab({ tournament, onUpdate, onRefresh }: {
  tournament: Tournament;
  onUpdate: (t: Partial<Tournament>) => void;
  onRefresh: () => void;
}) {
  const [newStatus, setNewStatus] = useState(tournament.status);
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    "draft", "open", "balancing", "live", "completed", "archived"
  ];

  async function handleStatusChange() {
    setLoading(true);
    const { error } = await supabase
      .from("tournaments")
      .update({ status: newStatus })
      .eq("id", tournament.id);
    setLoading(false);
    if (error) {
      toast({ title: "Update Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status Changed", description: `Status set to ${newStatus}` });
      onUpdate({ status: newStatus });
      onRefresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-xs text-slate-400">Current status:</span>{" "}
        <Badge className="bg-yellow-800/60">{tournament.status}</Badge>
      </div>
      <div className="flex flex-col md:flex-row gap-2 items-center">
        <select
          value={newStatus}
          onChange={e => setNewStatus(e.target.value)}
          className="rounded border p-2 bg-slate-800 text-white"
          disabled={loading}
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <Button className="mt-2 md:mt-0" size="sm" onClick={handleStatusChange} disabled={tournament.status === newStatus || loading}>
          Set Status
        </Button>
      </div>
      <div className="mt-4 text-xs font-semibold text-yellow-200">Emergency Controls:</div>
      <div className="flex flex-wrap gap-2">
        {/* Emergency open registration */}
        <Button size="sm" variant="outline" onClick={async () => {
          setLoading(true);
          const { error } = await supabase
            .from("tournaments")
            .update({ status: "open" })
            .eq("id", tournament.id);
          setLoading(false);
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
          } else {
            toast({ title: "Registration forced OPEN" });
            onRefresh();
          }
        }}>Force Open Registration</Button>
        {/* Emergency close registration */}
        <Button size="sm" variant="outline" onClick={async () => {
          setLoading(true);
          const { error } = await supabase
            .from("tournaments")
            .update({ status: "balancing" })
            .eq("id", tournament.id);
          setLoading(false);
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
          } else {
            toast({ title: "Registration forced CLOSED" });
            onRefresh();
          }
        }}>Force End Registration</Button>
        {/* Start/stop check-in */}
        <Button size="sm" variant="outline" onClick={async () => {
          setLoading(true);
          const { error } = await supabase
            .from("tournaments")
            .update({ status: "live" })
            .eq("id", tournament.id);
          setLoading(false);
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
          } else {
            toast({ title: "Force Start Check-In/Live" });
            onRefresh();
          }
        }}>Force Live</Button>
      </div>
      <div className="mt-4 text-xs opacity-60">These force tournament lifecycle transitions regardless of normal schedule, for EMERGENCIES only.</div>
    </div>
  );
}
