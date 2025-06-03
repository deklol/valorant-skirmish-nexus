
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, User } from "lucide-react";
import { getRankPoints } from "@/utils/rankingSystem";

interface Player {
  id: string;
  discord_username: string;
  riot_id: string;
  current_rank: string;
  weight_rating: number;
  is_phantom: boolean;
  name?: string;
}

interface DraggablePlayerProps {
  player: Player;
}

const DraggablePlayer = ({ player }: DraggablePlayerProps) => {
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
    opacity: isDragging ? 0.5 : 1,
  };

  const getRankColor = (rank: string) => {
    if (rank === 'Phantom') return 'bg-purple-500/20 text-purple-400';
    if (rank.includes('Iron')) return 'bg-gray-500/20 text-gray-400';
    if (rank.includes('Bronze')) return 'bg-amber-600/20 text-amber-400';
    if (rank.includes('Silver')) return 'bg-slate-500/20 text-slate-400';
    if (rank.includes('Gold')) return 'bg-yellow-500/20 text-yellow-400';
    if (rank.includes('Platinum')) return 'bg-cyan-500/20 text-cyan-400';
    if (rank.includes('Diamond')) return 'bg-blue-500/20 text-blue-400';
    if (rank.includes('Ascendant')) return 'bg-green-500/20 text-green-400';
    if (rank.includes('Immortal')) return 'bg-red-500/20 text-red-400';
    if (rank.includes('Radiant')) return 'bg-yellow-300/20 text-yellow-300';
    return 'bg-slate-500/20 text-slate-400';
  };

  const rankPoints = getRankPoints(player.current_rank || 'Unranked');

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="bg-slate-700 border-slate-600 cursor-grab active:cursor-grabbing hover:bg-slate-600 transition-colors"
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-slate-400" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {player.is_phantom && <User className="w-4 h-4 text-purple-400" />}
              <div className="text-white font-medium truncate">
                {player.discord_username || player.name}
              </div>
            </div>
            <div className="text-slate-400 text-xs truncate">
              {player.riot_id}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getRankColor(player.current_rank || 'Unranked')}>
                {player.current_rank || 'Unranked'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {rankPoints} pts
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DraggablePlayer;
