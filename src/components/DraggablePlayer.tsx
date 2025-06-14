
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";

interface Player {
  id: string;
  discord_username: string;
  rank_points: number;
  riot_id?: string;
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
  };

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
              <span className="text-white font-medium">{player.discord_username}</span>
              <Badge variant="outline" className="text-slate-300 border-slate-500">
                {player.rank_points} pts
              </Badge>
            </div>
            {player.riot_id && (
              <p className="text-sm text-slate-400">{player.riot_id}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggablePlayer;
