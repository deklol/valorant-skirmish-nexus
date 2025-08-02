import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useVetoSession } from "@/hooks/useVetoSession";
import { VetoProgress } from "./VetoProgress";
import { DiceRollPhase } from "./DiceRollPhase";
import { BanPhase } from "./BanPhase";
import { SideChoicePhase } from "./SideChoicePhase";
import { CompletedPhase } from "./CompletedPhase";
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    refresh,
    refreshAfterAction,
    connectionStatus,
    lastUpdate 
  } = useVetoSession(matchId);
  
  const [bestOf, setBestOf] = useState<number>(1);
  
  // Get match format (BO1, BO3, etc.)
  useEffect(() => {
    const fetchMatchFormat = async () => {
      try {
        const { data } = await supabase
          .from('matches')
          .select('best_of')
          .eq('id', matchId)
          .single();
        
        if (data) {
          setBestOf(data.best_of);
        }
      } catch (error) {
        console.error('Error fetching match format:', error);
      }
    };

    fetchMatchFormat();
  }, [matchId]);

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

  // Get team names from session data
  const homeTeamName = session?.home_team?.name || 'Home Team';
  const awayTeamName = session?.away_team?.name || 'Away Team';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white text-xl">
                Map Veto - {team1Name} vs {team2Name} (BO{bestOf})
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {bestOf === 1 
                  ? 'Ban maps until one remains for the match'
                  : bestOf === 3
                  ? 'Ban and pick maps for the best-of-3 series'
                  : 'Select maps through the competitive veto process'
                }
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'} className="flex items-center gap-1">
                {connectionStatus === 'connected' ? (
                  <><Wifi className="w-3 h-3" /> Live</>
                ) : connectionStatus === 'connecting' ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Connecting</>
                ) : (
                  <><WifiOff className="w-3 h-3" /> Offline</>
                )}
              </Badge>
              
              {/* Manual Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {lastUpdate && connectionStatus !== 'connected' && (
            <div className="text-xs text-slate-500 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
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
              onRollComplete={refreshAfterAction}
            />
          )}

          {phase === 'banning' && session && (
            <BanPhase
              matchId={matchId}
              session={session}
              isMyTurn={isMyTurn}
              canAct={canAct}
              onBanComplete={refreshAfterAction}
              bestOf={bestOf}
            />
          )}

          {phase === 'side_choice' && session && (
            <SideChoicePhase
              matchId={matchId}
              session={session}
              isMyTurn={isMyTurn}
              canAct={canAct}
              userTeamId={userTeamId}
              onSideChosen={refreshAfterAction}
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