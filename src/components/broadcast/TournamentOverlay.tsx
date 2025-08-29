import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Trophy, Target } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import type { Team } from "@/types/tournamentDetail";

interface TournamentOverlayProps {
  tournament: Tournament;
  teams: Team[];
  className?: string;
}

export default function TournamentOverlay({ 
  tournament, 
  teams, 
  className = "" 
}: TournamentOverlayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-600 animate-pulse';
      case 'completed': return 'bg-green-600';
      case 'upcoming': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getTotalPlayers = () => {
    return teams.reduce((total, team) => total + team.team_members.length, 0);
  };

  const getAverageRank = () => {
    const totalPoints = teams.reduce((total, team) => total + (team.total_rank_points || 0), 0);
    const totalTeams = teams.length;
    return totalTeams > 0 ? Math.round(totalPoints / totalTeams) : 0;
  };

  return (
    <div className={`absolute top-4 left-4 space-y-3 z-10 ${className}`}>
      {/* Tournament Header */}
      <Card className="bg-black/80 backdrop-blur border-white/20 p-4 min-w-80">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white truncate flex-1 mr-4">
            {tournament.name}
          </h2>
          <Badge className={`${getStatusColor(tournament.status)} text-white px-3 py-1`}>
            {tournament.status?.toUpperCase()}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-slate-300">
            <Calendar className="w-4 h-4" />
            <span>{new Date(tournament.start_time).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-300">
            <Clock className="w-4 h-4" />
            <span>{formatTime(currentTime)}</span>
          </div>
        </div>
      </Card>

      {/* Tournament Stats */}
      <Card className="bg-black/80 backdrop-blur border-white/20 p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center">
          <Trophy className="w-4 h-4 mr-2" />
          Tournament Stats
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-300">
            <span className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              Teams:
            </span>
            <span className="text-white font-semibold">{teams.length}</span>
          </div>
          
          <div className="flex justify-between text-slate-300">
            <span>Total Players:</span>
            <span className="text-white font-semibold">{getTotalPlayers()}</span>
          </div>
          
          <div className="flex justify-between text-slate-300">
            <span className="flex items-center">
              <Target className="w-3 h-3 mr-1" />
              Avg Team Rating:
            </span>
            <span className="text-white font-semibold">{getAverageRank()}</span>
          </div>
          
          {tournament.prize_pool && (
            <div className="flex justify-between text-slate-300">
              <span>Prize Pool:</span>
              <span className="text-yellow-400 font-semibold">{tournament.prize_pool}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Format Info */}
      <Card className="bg-black/80 backdrop-blur border-white/20 p-4">
        <h4 className="font-semibold text-white mb-2">Format</h4>
        <div className="space-y-1 text-sm text-slate-300">
          <div className="flex justify-between">
            <span>Match Format:</span>
            <span className="text-white">{tournament.match_format}</span>
          </div>
          {tournament.bracket_type && (
            <div className="flex justify-between">
              <span>Bracket:</span>
              <span className="text-white capitalize">
                {tournament.bracket_type.replace('_', ' ')}
              </span>
            </div>
          )}
          {(tournament as any).enable_adaptive_weights && (
            <div className="flex justify-between">
              <span>Adaptive Weights:</span>
              <span className="text-purple-400">Enabled</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}