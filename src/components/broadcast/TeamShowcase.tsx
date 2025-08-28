import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Team } from "@/types/tournamentDetail";
import type { TransitionType } from "@/hooks/useBroadcastScene";

interface TeamShowcaseProps {
  teams: Team[];
  currentTeamIndex: number;
  currentPlayerIndex: number;
  transition: TransitionType;
  onPlayerClick?: (playerIndex: number) => void;
  onTeamClick?: (teamIndex: number) => void;
}

export default function TeamShowcase({ 
  teams, 
  currentTeamIndex, 
  currentPlayerIndex, 
  transition,
  onPlayerClick,
  onTeamClick 
}: TeamShowcaseProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentPlayerInTeam, setCurrentPlayerInTeam] = useState(0);

  const currentTeam = teams[currentTeamIndex];

  useEffect(() => {
    if (transition === 'fade') {
      setIsVisible(false);
      const timeout = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timeout);
    }
  }, [currentTeamIndex, transition]);

  useEffect(() => {
    if (!currentTeam) return;
    
    const interval = setInterval(() => {
      setCurrentPlayerInTeam(prev => (prev + 1) % currentTeam.team_members.length);
    }, 2000); // Change player every 2 seconds

    return () => clearInterval(interval);
  }, [currentTeam]);

  if (!currentTeam) return null;

  const transitionClasses = {
    fade: isVisible ? "opacity-100" : "opacity-0",
    slide: "transform transition-transform duration-500",
    cascade: "animate-fade-in"
  };

  const currentPlayer = currentTeam.team_members[currentPlayerInTeam];
  
  return (
    <div className={`w-full h-full flex items-center justify-center transition-opacity duration-300 ${transitionClasses[transition]}`}>
      <div className="max-w-7xl w-full mx-auto px-8">
        {/* Team Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-7xl font-bold text-white mb-6 drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent"
            onClick={() => onTeamClick?.(currentTeamIndex)}
          >
            {currentTeam.name}
          </h1>
          <div className="flex items-center justify-center space-x-6 mb-4">
            <Badge variant="secondary" className="text-xl px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600">
              Seed #{currentTeam.seed || 'N/A'}
            </Badge>
            <Badge variant="outline" className="text-xl px-4 py-2 border-yellow-500 text-yellow-400">
              {currentTeam.total_rank_points} Total Points
            </Badge>
            <Badge variant="outline" className="text-xl px-4 py-2 border-green-500 text-green-400">
              Avg: {Math.round(currentTeam.total_rank_points / currentTeam.team_members.length)}
            </Badge>
          </div>
          {/* Team Status Indicator */}
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-slate-300 text-lg">Active Team</span>
          </div>
        </div>

        {/* Main Player Spotlight */}
        <div className="grid grid-cols-3 gap-6 items-stretch mb-6">
          {/* Player Avatar & Info */}
          <div className="flex flex-col items-center">
            <Avatar 
              className="w-48 h-48 mb-6 border-4 border-white shadow-2xl cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onPlayerClick?.(currentPlayerInTeam)}
            >
              <AvatarImage src={currentPlayer.users.discord_avatar_url || undefined} />
              <AvatarFallback className="text-4xl bg-gradient-to-br from-slate-700 to-slate-600">
                {currentPlayer.users.discord_username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 
              className="text-4xl font-bold text-white text-center cursor-pointer hover:text-blue-300 transition-colors"
              onClick={() => onPlayerClick?.(currentPlayerInTeam)}
            >
              {currentPlayer.users.discord_username}
            </h3>
            {currentPlayer.users.riot_id && (
              <p className="text-2xl text-slate-300 mt-2">{currentPlayer.users.riot_id}</p>
            )}
            {currentPlayer.is_captain && (
              <Badge className="mt-4 text-xl px-4 py-1 bg-yellow-600 hover:bg-yellow-500">
                Team Captain
              </Badge>
            )}
          </div>

          {/* Enhanced Player Stats */}
          <Card className="bg-black/60 backdrop-blur border-white/30 p-6 h-full">
            <div className="space-y-4 h-full flex flex-col">
              <div className="text-center">
                <h4 className="text-2xl font-bold text-white mb-3">Current Rank</h4>
                <Badge variant="outline" className="text-xl px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none">
                  {currentPlayer.users.current_rank}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-center flex-1">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-sm text-slate-300">Rank Points</p>
                  <p className="text-xl font-bold text-white">{currentPlayer.users.rank_points || 'N/A'}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-sm text-slate-300">
                    {(currentPlayer.users as any).adaptive_weight ? 'Adaptive' : 'Weight'}
                  </p>
                  <p className="text-xl font-bold text-white">
                    {(currentPlayer.users as any).adaptive_weight || currentPlayer.users.weight_rating || 'N/A'}
                  </p>
                </div>
                {currentPlayer.users.peak_rank && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-sm text-slate-300">Peak Rank</p>
                    <p className="text-lg font-bold text-yellow-400">{currentPlayer.users.peak_rank}</p>
                  </div>
                )}
                {(currentPlayer.users as any).peak_rank_points && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-sm text-slate-300">Peak Points</p>
                    <p className="text-lg font-bold text-yellow-400">{(currentPlayer.users as any).peak_rank_points}</p>
                  </div>
                )}
              </div>
              
              {(currentPlayer.users as any).adaptive_factor && (
                <div className="text-center mt-2 p-3 bg-purple-900/40 rounded-lg border border-purple-500/30">
                  <p className="text-sm text-purple-200">Adaptive Factor</p>
                  <p className="text-lg font-bold text-purple-300">{((currentPlayer.users as any).adaptive_factor * 100).toFixed(1)}%</p>
                </div>
              )}
            </div>
          </Card>

          {/* Enhanced Team Roster Preview */}
          <Card className="bg-black/60 backdrop-blur border-white/30 p-4 h-full">
            <h4 className="text-xl font-bold text-white text-center mb-4">Team Roster</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {currentTeam.team_members.map((member, index) => (
                <div 
                  key={member.user_id}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 cursor-pointer border ${
                    index === currentPlayerInTeam 
                      ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-blue-400 scale-105 shadow-lg shadow-blue-500/25' 
                      : 'bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 hover:scale-102 hover:border-slate-500'
                  }`}
                  onClick={() => {
                    setCurrentPlayerInTeam(index);
                    onPlayerClick?.(index);
                  }}
                >
                  <Avatar className="w-10 h-10 border-2 border-white/20">
                    <AvatarImage src={member.users.discord_avatar_url || undefined} />
                    <AvatarFallback className="text-sm bg-gradient-to-br from-slate-700 to-slate-600">
                      {member.users.discord_username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate text-sm">
                      {member.users.discord_username}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-slate-300">{member.users.current_rank}</p>
                      <span className="text-xs text-slate-400">•</span>
                      <p className="text-xs text-slate-400">
                        {(member.users as any).adaptive_weight || member.users.weight_rating || 150}pts
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {member.is_captain && (
                      <Badge variant="secondary" className="text-xs bg-yellow-600 hover:bg-yellow-500">
                        C
                      </Badge>
                    )}
                    {index === currentPlayerInTeam && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Team Progress Indicator */}
        <div className="text-center">
          <p className="text-xl text-slate-300 mb-2">
            Team {currentTeamIndex + 1} of {teams.length}
          </p>
          <div className="flex justify-center space-x-2">
            {teams.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer hover:scale-110 ${
                  index === currentTeamIndex ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'
                }`}
                onClick={() => onTeamClick?.(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}