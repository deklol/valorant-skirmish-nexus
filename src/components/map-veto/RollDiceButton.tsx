
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dice3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RollDiceButtonProps {
  sessionId: string;
  team1Id: string;
  team2Id: string;
  isCaptain: boolean;
  disabled?: boolean;
  onComplete?: (result: { home_team_id: string; away_team_id: string; roll_seed: string }) => void;
}

const RollDiceButton: React.FC<RollDiceButtonProps> = ({
  sessionId,
  team1Id,
  team2Id,
  isCaptain,
  disabled,
  onComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRoll = async () => {
    setLoading(true);

    // Use current time + sessionId as roll seed for auditable randomness (could use crypto if needed, but this is deterministic)
    const seed = `${sessionId}-${Date.now()}`;
    const hash = Array
      .from(seed)
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // Fair roll/assignment: if hash even -> team1 home, else team2 home
    const home_team_id = hash % 2 === 0 ? team1Id : team2Id;
    const away_team_id = hash % 2 === 0 ? team2Id : team1Id;

    try {
      // Who is pressing?
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const roll_initiator_id = userData.user?.id ?? null;
      const roll_timestamp = new Date().toISOString();

      // Store in session
      const { error } = await supabase
        .from('map_veto_sessions')
        .update({
          home_team_id,
          away_team_id,
          roll_seed: seed,
          roll_initiator_id,
          roll_timestamp,
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Dice Rolled!",
        description:
          (home_team_id === team1Id
            ? "Team 1"
            : "Team 2") +
          " is Home.",
      });

      onComplete &&
        onComplete({ home_team_id, away_team_id, roll_seed: seed });
    } catch (e: any) {
      toast({
        title: "Dice roll failed",
        description: e.message ?? "Could not assign home/away.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRoll}
      disabled={loading || !isCaptain || disabled}
      className="bg-blue-800 hover:bg-blue-900"
      size="sm"
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin w-4 h-4 mr-1" />
          Rolling...
        </>
      ) : (
        <>
          <Dice3 className="w-4 h-4 mr-1" />
          Roll the Dice!
        </>
      )}
    </Button>
  );
};

export default RollDiceButton;
