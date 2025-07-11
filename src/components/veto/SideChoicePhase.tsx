import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VetoService } from '@/services/VetoService';
import { VetoSessionData } from '@/hooks/useVetoSession';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Sword, Shield, Loader2 } from 'lucide-react';

interface SideChoicePhaseProps {
  matchId: string;
  session: VetoSessionData;
  isMyTurn: boolean;
  canAct: boolean;
  userTeamId: string | null;
  onSideChosen: () => void;
}

export function SideChoicePhase({ 
  matchId, 
  session, 
  isMyTurn, 
  canAct, 
  userTeamId, 
  onSideChosen 
}: SideChoicePhaseProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [choosing, setChoosing] = useState<'Attack' | 'Defense' | null>(null);

  const handleChooseSide = async (side: 'Attack' | 'Defense') => {
    if (!user || !isMyTurn) return;

    setChoosing(side);
    try {
      const result = await VetoService.chooseSide(session.id, user.id, side);
      
      if (result.success) {
        toast({
          title: "Side Chosen",
          description: `Your team will start on ${side}`,
        });
        onSideChosen();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to choose side",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to choose side",
        variant: "destructive"
      });
    } finally {
      setChoosing(null);
    }
  };

  // Get the selected map
  const selectedMap = session.actions.find(action => action.action === 'pick')?.map;
  const isHomeTeam = userTeamId === session.home_team_id;

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <Sword className="w-16 h-16 mx-auto text-blue-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Choose Starting Side
        </h3>
        {selectedMap && (
          <p className="text-slate-400 mb-4">
            Selected Map: <span className="text-white font-semibold">{selectedMap.display_name}</span>
          </p>
        )}
        <p className="text-slate-400">
          {isHomeTeam 
            ? "As the home team, choose which side you'd like to start on."
            : "Waiting for the home team to choose their starting side..."
          }
        </p>
      </div>

      {isMyTurn && canAct && isHomeTeam ? (
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => handleChooseSide('Attack')}
            disabled={choosing === 'Attack'}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
          >
            {choosing === 'Attack' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Choosing...
              </>
            ) : (
              <>
                <Sword className="w-4 h-4 mr-2" />
                Attack
              </>
            )}
          </Button>

          <Button
            onClick={() => handleChooseSide('Defense')}
            disabled={choosing === 'Defense'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            {choosing === 'Defense' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Choosing...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Defense
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="text-slate-500">
          {!isHomeTeam 
            ? "Only the home team can choose the starting side"
            : "You cannot choose the side at this time"
          }
        </div>
      )}
    </div>
  );
}