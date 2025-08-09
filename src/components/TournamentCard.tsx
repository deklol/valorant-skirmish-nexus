
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, Trophy, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tournament } from "@/types/tournament";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface TournamentCardProps {
  tournament: Tournament & {
    currentSignups: number;
    maxPlayers: number;
    prizePool: string;
    startTime: Date;
    format: "BO1" | "BO3";
  };
}

const TournamentCard = ({ tournament }: TournamentCardProps) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "balancing":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "live":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "draft":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "archived":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleCardClick = () => {
    navigate(`/tournament/${tournament.id}`);
  };

  const handleBracketClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/bracket/${tournament.id}`);
  };

  return (
    <Card 
      className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all cursor-pointer hover:bg-slate-800/80"
      onClick={handleCardClick}
    >
      {tournament.banner_image_url && (
        <div className="overflow-hidden rounded-t-md">
          <AspectRatio ratio={16 / 9}>
            <img
              src={tournament.banner_image_url}
              alt={`${tournament.name} banner image`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </AspectRatio>
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-white text-lg">{tournament.name}</CardTitle>
          <Badge className={getStatusColor(tournament.status)}>
            {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4" />
            <span>{tournament.currentSignups}/{tournament.maxPlayers} Players</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Trophy className="w-4 h-4" />
            <span>{tournament.format}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Calendar className="w-4 h-4" />
            <span>{tournament.prizePool}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4" />
            <span>{formatDate(tournament.startTime)}</span>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={handleCardClick}
          >
            View Details
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={handleBracketClick}
          disabled>
            View Bracket
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentCard;
