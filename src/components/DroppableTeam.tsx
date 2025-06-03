
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import DraggablePlayer from "./DraggablePlayer";
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

interface Team {
  id: string;
  name: string;
  players: Player[];
  totalPoints: number;
}

interface DroppableTeamProps {
  team: Team;
}

const DroppableTeam = ({ team }: DroppableTeamProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `team-${team.id}`,
  });

  const totalPoints = team.players.reduce((sum, player) => 
    sum + getRankPoints(player.current_rank || 'Unranked'), 0
  );

  const averagePoints = team.players.length > 0 
    ? Math.round(totalPoints / team.players.length)
    : 0;

  return (
    <Card 
      ref={setNodeRef}
      className={`bg-slate-800 border-slate-700 ${
        isOver ? 'ring-2 ring-blue-500 bg-slate-700' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">{team.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-slate-300">
              <Users className="w-3 h-3 mr-1" />
              {team.players.length}/5
            </Badge>
            <Badge variant="secondary">
              Avg: {averagePoints}
            </Badge>
          </div>
        </div>
        <div className="text-sm text-slate-400">
          Total Points: {totalPoints}
        </div>
      </CardHeader>
      <CardContent>
        <SortableContext 
          items={team.players.map(p => p.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[300px] border-2 border-dashed border-slate-600 rounded p-2">
            {team.players.map((player) => (
              <DraggablePlayer key={player.id} player={player} />
            ))}
            {team.players.length === 0 && (
              <div className="flex items-center justify-center h-[280px] text-slate-500">
                Drop players here
              </div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
};

export default DroppableTeam;
