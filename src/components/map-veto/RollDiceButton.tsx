
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
    console.log(`🎲 RollDiceButton: Starting dice roll for session ${sessionId.slice(0, 8)}`);
    setLoading(true);

    // Use current time + sessionId as roll seed for auditable randomness (could use crypto if needed, but this is deterministic)
    const seed = `${sessionId}-${Date.now()}`;
    const hash = Array
      .from(seed)
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // Fair roll/assignment: if hash even -> team1 home, else team2 home
    const home_team_id = hash % 2 === 0 ? team1Id : team2Id;
    const away_team_id = hash % 2 === 0 ? team2Id : team1Id;

    console.log(`🎯 RollDiceButton: Dice roll result:`, {
      seed: seed.slice(0, 32),
      hash,
      isEven: hash % 2 === 0,
      homeTeam: home_team_id,
      awayTeam: away_team_id,
      team1Id,
      team2Id
    });

    try {
      // Who is pressing?
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const roll_initiator_id = userData.user?.id ?? null;
      const roll_timestamp = new Date().toISOString();

      console.log(`💾 RollDiceButton: Updating session with dice roll results and setting turn to home team`);

      // Store in session AND set current_turn_team_id to home team (home team goes first)
      const { error } = await supabase
        .from('map_veto_sessions')
        .update({
          home_team_id,
          away_team_id,
          roll_seed: seed,
          roll_initiator_id,
          roll_timestamp,
          current_turn_team_id: home_team_id, // CRITICAL: Set turn to home team
          status: 'in_progress' // Also update status to in_progress
        })
        .eq('id', sessionId);

      if (error) throw error;

      console.log(`✅ RollDiceButton: Successfully updated session:`, {
        homeTeam: home_team_id,
        awayTeam: away_team_id,
        currentTurn: home_team_id,
        status: 'in_progress'
      });

      toast({
        title: "Dice Rolled!",
        description:
          (home_team_id === team1Id
            ? "Team 1"
            : "Team 2") +
          " is Home and goes first.",
      });

      onComplete &&
        onComplete({ home_team_id, away_team_id, roll_seed: seed });
    } catch (e: any) {
      console.error(`❌ RollDiceButton: Dice roll failed:`, e);
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
