import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from "lucide-react";

interface Match {
  id: string;
  team1?: { name: string; };
  team2?: { name: string; };
  winner_id?: string;
  status: string;
  round_number: number;
  match_number: number;
}

interface MobileBracketViewProps {
  matches: Match[];
  onMatchClick?: (matchId: string) => void;
}

const MobileBracketView = ({ matches, onMatchClick }: MobileBracketViewProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Group matches by rounds for mobile layout
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round_number]) {
      acc[match.round_number] = [];
    }
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const getMatchStatus = (match: Match) => {
    switch (match.status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'live':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const isWinner = (teamId: string, match: Match) => {
    return match.winner_id === teamId;
  };

  return (
    <div className="h-[400px] md:h-[600px] relative overflow-hidden bg-slate-900 rounded-lg border border-slate-700">
      {/* Mobile Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          className="h-8 w-8 p-0 bg-slate-800 border-slate-600 hover:bg-slate-700"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          className="h-8 w-8 p-0 bg-slate-800 border-slate-600 hover:bg-slate-700"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-8 w-8 p-0 bg-slate-800 border-slate-600 hover:bg-slate-700"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Pinch/Pan Instructions */}
      <div className="absolute bottom-2 left-2 z-10 text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded">
        Pinch to zoom • Drag to pan
      </div>

      {/* Bracket Container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile Bracket Layout - Horizontal Scrolling */}
        <div
          className="h-full flex gap-6 p-4 transition-transform"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center',
            minWidth: 'max-content'
          }}
        >
          {rounds.map((roundNumber) => (
            <div key={roundNumber} className="flex flex-col gap-4 min-w-[200px]">
              <div className="text-center mb-4">
                <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                  Round {roundNumber}
                </Badge>
              </div>
              
              {matchesByRound[roundNumber].map((match) => (
                <Card
                  key={match.id}
                  className={`bg-slate-800 border-slate-700 hover:border-slate-600 transition-all cursor-pointer ${
                    onMatchClick ? 'hover:bg-slate-750' : ''
                  }`}
                  onClick={() => onMatchClick?.(match.id)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {/* Match Status */}
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${getMatchStatus(match)}`}>
                          {match.status}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          M{match.match_number}
                        </span>
                      </div>
                      
                      {/* Teams */}
                      <div className="space-y-1">
                        <div
                          className={`text-sm p-2 rounded border ${
                            match.team1 && isWinner(match.team1.name, match)
                              ? 'bg-green-500/20 border-green-500/30 text-green-400'
                              : 'bg-slate-700 border-slate-600 text-slate-300'
                          }`}
                        >
                          {match.team1?.name || 'TBD'}
                        </div>
                        <div className="text-xs text-slate-500 text-center">vs</div>
                        <div
                          className={`text-sm p-2 rounded border ${
                            match.team2 && isWinner(match.team2.name, match)
                              ? 'bg-green-500/20 border-green-500/30 text-green-400'
                              : 'bg-slate-700 border-slate-600 text-slate-300'
                          }`}
                        >
                          {match.team2?.name || 'TBD'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileBracketView;