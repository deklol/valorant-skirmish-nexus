import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VetoService } from '@/services/VetoService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dice1, Loader2 } from 'lucide-react';

interface DiceRollPhaseProps {
  matchId: string;
  canAct: boolean;
  onRollComplete: () => void;
}

export function DiceRollPhase({ matchId, canAct, onRollComplete }: DiceRollPhaseProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rolling, setRolling] = useState(false);

  const handleRollDice = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to roll dice",
        variant: "destructive"
      });
      return;
    }

    setRolling(true);
    try {
      const result = await VetoService.rollDice(matchId, user.id);
      
      if (result.success) {
        toast({
          title: "Dice Rolled!",
          description: `Rolled ${result.dice_result}! Home/Away teams have been assigned.`,
        });
        onRollComplete();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to roll dice",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to roll dice",
        variant: "destructive"
      });
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <Dice1 className="w-16 h-16 mx-auto text-blue-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Roll for Home/Away Teams
        </h3>
        <p className="text-slate-400">
          Any team member can roll the dice to determine which team gets to pick home or away.
        </p>
      </div>

      <Button
        onClick={handleRollDice}
        disabled={!canAct || rolling}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
      >
        {rolling ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Rolling...
          </>
        ) : (
          <>
            <Dice1 className="w-4 h-4 mr-2" />
            Roll Dice
          </>
        )}
      </Button>

      {!canAct && (
        <p className="text-slate-500 text-sm mt-4">
          You must be on one of the participating teams to roll dice
        </p>
      )}
    </div>
  );
}