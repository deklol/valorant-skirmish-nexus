
import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Settings, TrendingUp, Zap } from "lucide-react";
import { StyledUsername } from "./StyledUsername";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { calculateEvidenceBasedWeightWithMiniAi, ExtendedUserRankData } from "@/utils/evidenceBasedWeightSystem";
import { useRecentTournamentWinners } from "@/hooks/useRecentTournamentWinners";

interface Player {
  id: string;
  discord_username: string;
  rank_points: number;
  riot_id?: string;
  current_rank?: string;
  peak_rank?: string;
  manual_rank_override?: string | null;
  manual_weight_override?: number | null;
  use_manual_override?: boolean;
  rank_override_reason?: string | null;
  weight_rating?: number;
  tournaments_won?: number;
}

interface DraggablePlayerProps {
  player: Player;
  enableAdaptiveWeights?: boolean;
}

const DraggablePlayer = ({ player, enableAdaptiveWeights }: DraggablePlayerProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id });
  
  const { recentWinnerIds } = useRecentTournamentWinners();
  const isRecentWinner = recentWinnerIds.has(player.id);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate the appropriate rank result based on ATLAS system
  // Use the same configuration as the actual balancing algorithm
  const [rankResult, setRankResult] = useState({ points: 150, source: 'loading', rank: 'Unranked' });
  
  useEffect(() => {
    const calculateWeight = async () => {
      if (enableAdaptiveWeights) {
        // Use ATLAS evidence-based system
        const result = await calculateEvidenceBasedWeightWithMiniAi(player as ExtendedUserRankData, {
          enableEvidenceBasedWeights: true,
          tournamentWinBonus: 15,
          rankDecayThreshold: 2,
          maxDecayPercent: 0.25,
          skillTierCaps: {
            enabled: true,
            eliteThreshold: 400,
            maxElitePerTeam: 1
          }
        }, true);
        setRankResult({
          points: result.finalAdjustedPoints,
          source: 'evidence_based',
          rank: result.evidenceResult.rank
        });
      } else {
        // Use standard system
        const result = getRankPointsWithManualOverride(player);
        setRankResult(result);
      }
    };
    calculateWeight();
  }, [enableAdaptiveWeights, player]);

  // Debug logging for Keras
  if (player.discord_username === 'keratasf') {
    console.log('Keras DraggablePlayer data:', {
      player: player,
      enableAdaptiveWeights,
      rankResult,
      tournaments_won: player.tournaments_won
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-move ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card className={`bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors ${
        isRecentWinner ? 'shadow-[0_0_8px_rgba(245,158,11,0.4)] border-amber-500/40' : ''
      }`}>
        <CardContent className="p-3 flex items-center gap-3">
          <GripVertical className="w-4 h-4 text-slate-400" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">
                  <StyledUsername username={player.discord_username} userId={player.id} />
                </span>
                <span className="text-slate-300">-</span>
                <span className="text-slate-300 text-sm">
                  {player.current_rank || 'Unranked'}
                </span>
                <span className="text-slate-300">-</span>
                <span className="text-slate-300 text-sm font-medium">
                  {rankResult.points} pts
                </span>
                {rankResult.source === 'evidence_based' && (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400 text-xs">
                    ATLAS
                  </Badge>
                )}
                {rankResult.source === 'manual_override' && (
                  <Badge variant="outline" className="text-purple-400 border-purple-400 text-xs">
                    Override
                  </Badge>
                )}
                {rankResult.source === 'peak_rank' && (
                  <Badge variant="outline" className="text-amber-400 border-amber-400 text-xs">
                    Peak
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggablePlayer;
