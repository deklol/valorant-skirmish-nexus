
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Settings, TrendingUp, Zap } from "lucide-react";
import { StyledUsername } from "./StyledUsername";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { calculateAdaptiveWeight, ExtendedUserRankData } from "@/utils/adaptiveWeightSystem";

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate the appropriate rank result based on adaptive weights setting
  // Use the same configuration as the actual balancing algorithm
  const rankResult = enableAdaptiveWeights 
    ? calculateAdaptiveWeight(player as ExtendedUserRankData, {
        enableAdaptiveWeights: true,
        baseFactor: 0.3, // Match DEFAULT_CONFIG
        decayMultiplier: 0.25,
        timeWeightDays: 60,
        tournamentWinnerBonuses: {
          enabled: true,
          oneWin: 15,
          twoWins: 25,
          threeOrMoreWins: 35,
          recentWinMultiplier: 1.5,
          eliteWinnerMultiplier: 1.2
        }
      })
    : getRankPointsWithManualOverride(player);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-move ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors">
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
                {rankResult.source === 'adaptive_weight' && (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400 text-xs">
                    Adaptive
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
