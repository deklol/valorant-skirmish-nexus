import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Users, MapPin } from "lucide-react";
import type { Tournament } from "@/types/tournament";

interface TournamentOverlayProps {
  tournament: Tournament;
  currentTime?: Date;
}

export default function TournamentOverlay({ tournament, currentTime = new Date() }: TournamentOverlayProps) {
  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500 animate-pulse';
      case 'completed': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <Card className="absolute top-4 right-4 bg-black/90 backdrop-blur border-white/20 text-white p-4 min-w-[300px]">
      <div className="space-y-3">
        {/* Tournament Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold text-lg truncate">{tournament.name}</h3>
          </div>
          <Badge 
            variant="outline" 
            className={`text-white border-white/30 ${getStatusColor(tournament.status || '')}`}
          >
            {tournament.status?.toUpperCase()}
          </Badge>
        </div>

        {/* Tournament Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">
                {tournament.start_time ? formatTime(tournament.start_time) : 'TBD'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-slate-300">{tournament.max_players} max players</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300">{tournament.match_format || 'BO1'}</span>
            </div>
            {tournament.prize_pool && (
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-slate-300">{tournament.prize_pool}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Time */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Current Time</span>
            <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}