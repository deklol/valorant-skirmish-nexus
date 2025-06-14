
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamCaptainEditorProps {
  teamId: string;
  members: {
    user_id: string;
    discord_username: string;
    is_captain: boolean;
    weight_rating: number;
    current_rank?: string;
  }[];
  onCaptainChanged?: () => void;
}

const TeamCaptainEditor = ({ teamId, members, onCaptainChanged }: TeamCaptainEditorProps) => {
  const { toast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);

  const assignCaptain = async (userId: string) => {
    setSavingId(userId);
    try {
      // Set everyone is_captain = false, then set the selected one to true
      const { error: unsetErr } = await supabase
        .from("team_members")
        .update({ is_captain: false })
        .eq("team_id", teamId);

      if (unsetErr) throw unsetErr;

      const { error: setErr } = await supabase
        .from("team_members")
        .update({ is_captain: true })
        .eq("team_id", teamId)
        .eq("user_id", userId);

      if (setErr) throw setErr;

      toast({
        title: "Captain Set",
        description: "Team captain has been updated.",
      });

      onCaptainChanged?.();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update captain",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-2">
            <Badge className={m.is_captain ? "bg-green-600 text-white" : "bg-slate-700"}>
              {m.discord_username}
              {m.is_captain && " (Captain)"}
            </Badge>
            <Button
              size="sm"
              disabled={m.is_captain || savingId === m.user_id}
              onClick={() => assignCaptain(m.user_id)}
            >
              {savingId === m.user_id ? "Saving..." : "Make Captain"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamCaptainEditor;

