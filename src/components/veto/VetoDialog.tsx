import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVetoSession } from "@/hooks/useVetoSession";
import { VetoProgress } from "./VetoProgress";
import { DiceRollPhase } from "./DiceRollPhase";
import { BanPhase } from "./BanPhase";
import { SideChoicePhase } from "./SideChoicePhase";
import { CompletedPhase } from "./CompletedPhase";
import { Loader2 } from "lucide-react";

interface VetoDialogProps {
  matchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team1Name: string;
  team2Name: string;
}

export function VetoDialog({ 
  matchId, 
  open, 
  onOpenChange, 
  team1Name, 
  team2Name 
}: VetoDialogProps) {
  const { 
    session, 
    loading, 
    error, 
    phase, 
    isMyTurn, 
    canAct,
    userTeamId,
    refresh 
  } = useVetoSession(matchId);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-2 text-white">Loading veto session...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">Error loading veto session</p>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Get team names based on session
  const homeTeamName = session?.home_team_id === team1Name ? team1Name : team2Name;
  const awayTeamName = session?.home_team_id === team1Name ? team2Name : team1Name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            Map Veto - {team1Name} vs {team2Name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <VetoProgress
            phase={phase}
            session={session}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            isMyTurn={isMyTurn}
            userTeamId={userTeamId}
          />

          {/* Phase-specific content */}
          {phase === 'dice_roll' && (
            <DiceRollPhase
              matchId={matchId}
              canAct={canAct}
              onRollComplete={refresh}
            />
          )}

          {phase === 'banning' && session && (
            <BanPhase
              matchId={matchId}
              session={session}
              isMyTurn={isMyTurn}
              canAct={canAct}
              onBanComplete={refresh}
            />
          )}

          {phase === 'side_choice' && session && (
            <SideChoicePhase
              matchId={matchId}
              session={session}
              isMyTurn={isMyTurn}
              canAct={canAct}
              userTeamId={userTeamId}
              onSideChosen={refresh}
            />
          )}

          {phase === 'completed' && session && (
            <CompletedPhase
              session={session}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}