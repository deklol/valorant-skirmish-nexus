import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, Trophy, Calendar, ChevronRight, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tournament } from "@/types/tournament";

interface MobileTournamentCardProps {
  tournament: Tournament & {
    currentSignups: number;
    maxPlayers: number;
    prizePool: string;
    startTime: Date;
    format: "BO1" | "BO3";
  };
  onSwipe?: () => void;
}

const MobileTournamentCard = ({ tournament, onSwipe }: MobileTournamentCardProps) => {
  const navigate = useNavigate();
  const [startX, setStartX] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const diffX = startX - endX;
    
    // Swipe left threshold
    if (diffX > 50) {
      onSwipe?.();
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/tournament/${tournament.id}`);
  };

  const handleBracketClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/bracket/${tournament.id}`);
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <Card 
      className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all touch-manipulation mb-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-white text-base leading-tight truncate pr-2">
              {tournament.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${getStatusColor(tournament.status)} text-xs`}>
                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
              </Badge>
              <span className="text-slate-400 text-xs">{tournament.format}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="p-1 h-8 w-8 text-slate-400 hover:text-white"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Quick Info - Always Visible */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4" />
            <span>{tournament.currentSignups}/{tournament.maxPlayers}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4" />
            <span className="truncate">{formatDate(tournament.startTime)}</span>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{tournament.prizePool}</span>
            </div>
            
            {/* Mobile Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                onClick={handleCardClick}
              >
                <Eye className="w-4 h-4 mr-1" />
                Details
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                onClick={handleBracketClick}
              >
                <Trophy className="w-4 h-4 mr-1" />
                Bracket
              </Button>
            </div>
          </div>
        )}

        {/* Swipe Hint */}
        {!isExpanded && (
          <div className="text-xs text-slate-500 text-center py-1">
            Tap to expand • Swipe left for more
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileTournamentCard;