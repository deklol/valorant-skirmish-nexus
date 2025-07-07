import { Badge } from "@/components/ui/badge";
import { VetoSessionData } from "@/hooks/useVetoSession";
import { Dice1, Ban, Sword, CheckCircle } from "lucide-react";

interface VetoProgressProps {
  phase: 'dice_roll' | 'banning' | 'side_choice' | 'completed';
  session: VetoSessionData | null;
  homeTeamName: string;
  awayTeamName: string;
  isMyTurn: boolean;
  userTeamId: string | null;
}

export function VetoProgress({ 
  phase, 
  session, 
  homeTeamName, 
  awayTeamName, 
  isMyTurn,
  userTeamId 
}: VetoProgressProps) {
  const getPhaseIcon = (currentPhase: string) => {
    switch (currentPhase) {
      case 'dice_roll': return <Dice1 className="w-4 h-4" />;
      case 'banning': return <Ban className="w-4 h-4" />;
      case 'side_choice': return <Sword className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPhaseLabel = (currentPhase: string) => {
    switch (currentPhase) {
      case 'dice_roll': return 'Dice Roll';
      case 'banning': return 'Banning Phase';
      case 'side_choice': return 'Side Selection';
      case 'completed': return 'Completed';
      default: return currentPhase;
    }
  };

  const getCurrentTurnTeamName = () => {
    if (!session?.current_turn_team_id) return '';
    return session.current_turn_team_id === session.home_team_id ? homeTeamName : awayTeamName;
  };

  const isUserOnHomeTeam = userTeamId === session?.home_team_id;
  const isUserOnAwayTeam = userTeamId === session?.away_team_id;

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getPhaseIcon(phase)}
          <h3 className="text-lg font-semibold text-white">
            {getPhaseLabel(phase)}
          </h3>
        </div>
        
        <Badge 
          variant="outline" 
          className={`${
            phase === 'completed' 
              ? 'border-green-500 text-green-400' 
              : 'border-blue-500 text-blue-400'
          }`}
        >
          {phase === 'completed' ? 'Complete' : 'In Progress'}
        </Badge>
      </div>

      {/* Team assignments (if dice rolled) */}
      {session && phase !== 'dice_roll' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-3 rounded-lg border ${
            isUserOnHomeTeam 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-slate-600 bg-slate-800'
          }`}>
            <div className="text-sm text-slate-400">Home Team</div>
            <div className="font-semibold text-white">{homeTeamName}</div>
            {session.current_turn_team_id === session.home_team_id && phase !== 'completed' && (
              <Badge className="mt-1 bg-green-600 text-white">Current Turn</Badge>
            )}
          </div>
          
          <div className={`p-3 rounded-lg border ${
            isUserOnAwayTeam 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-slate-600 bg-slate-800'
          }`}>
            <div className="text-sm text-slate-400">Away Team</div>
            <div className="font-semibold text-white">{awayTeamName}</div>
            {session.current_turn_team_id === session.away_team_id && phase !== 'completed' && (
              <Badge className="mt-1 bg-green-600 text-white">Current Turn</Badge>
            )}
          </div>
        </div>
      )}

      {/* Turn indicator */}
      {phase !== 'completed' && session && (
        <div className="text-center">
          {isMyTurn ? (
            <p className="text-green-400 font-semibold">
              🎯 It's your turn!
            </p>
          ) : (
            <p className="text-slate-400">
              Waiting for {getCurrentTurnTeamName()}...
            </p>
          )}
        </div>
      )}
    </div>
  );
}