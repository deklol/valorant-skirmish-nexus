
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Settings, TrendingUp, Zap } from "lucide-react";
import { StyledUsername } from "./StyledUsername";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { calculateAdaptiveWeight } from "@/utils/adaptiveWeightSystem";

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
  const rankResult = enableAdaptiveWeights 
    ? calculateAdaptiveWeight(player, { enableAdaptiveWeights: true, baseFactor: 0.5, decayMultiplier: 0.15, timeWeightDays: 90 })
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
                {rankResult.source === 'manual_override' && (
                  <Badge className="bg-purple-600 text-white text-xs flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Override
                  </Badge>
                )}
                {rankResult.source === 'peak_rank' && (
                  <Badge className="bg-amber-600 text-white text-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Peak
                  </Badge>
                )}
                {rankResult.source === 'adaptive_weight' && (
                  <Badge className="bg-emerald-600 text-white text-xs flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Adaptive
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="text-slate-300 border-slate-500">
                {rankResult.points} pts
              </Badge>
            </div>
            <div className="text-xs text-slate-400">
              {rankResult.source === 'manual_override' ? (
                <span>{rankResult.rank} • {rankResult.overrideReason || 'Admin override'}</span>
              ) : rankResult.source === 'adaptive_weight' ? (
                <span>{rankResult.rank} • Adaptive calculation</span>
              ) : rankResult.source === 'peak_rank' ? (
                <span>{player.current_rank || 'Unrated'} → {rankResult.rank}</span>
              ) : (
                <span>{player.current_rank || 'Unranked'} • {player.riot_id || 'Standard weight'}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggablePlayer;
