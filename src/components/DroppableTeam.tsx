
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import DraggablePlayer from './DraggablePlayer';

interface Player {
  id: string;
  discord_username: string;
  rank_points: number;
  riot_id?: string;
}

interface Team {
  id: string;
  name: string;
  members: Player[];
  avgRankScore: number;
}

interface DroppableTeamProps {
  team: Team;
}

const DroppableTeam = ({ team }: DroppableTeamProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `team-${team.id}`,
  });

  return (
    <Card className={`bg-slate-800 border-slate-700 transition-colors ${isOver ? 'border-blue-500 bg-slate-700' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {team.name}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-slate-300 border-slate-500">
              {team.members.length} players
            </Badge>
            <Badge variant="outline" className="text-blue-300 border-blue-500">
              Avg: {Math.round(team.avgRankScore)} pts
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SortableContext 
          items={team.members.map(p => p.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div 
            ref={setNodeRef}
            className="space-y-2 min-h-[100px] border-2 border-dashed border-slate-600 rounded-lg p-4"
          >
            {team.members.length === 0 ? (
              <p className="text-slate-400 text-center py-4">
                Drop players here
              </p>
            ) : (
              team.members.map(player => (
                <DraggablePlayer key={player.id} player={player} />
              ))
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
};

export default DroppableTeam;
