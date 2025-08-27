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
      <div className="max-w-6xl w-full mx-auto px-8">
        {/* Team Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-8xl font-bold text-white mb-4 drop-shadow-lg cursor-pointer hover:scale-105 transition-transform"
            onClick={() => onTeamClick?.(currentTeamIndex)}
          >
            {currentTeam.name}
          </h1>
          <div className="flex items-center justify-center space-x-8">
            <Badge variant="secondary" className="text-2xl px-6 py-2">
              Seed #{currentTeam.seed || 'N/A'}
            </Badge>
            <Badge variant="outline" className="text-2xl px-6 py-2">
              {currentTeam.total_rank_points} Points
            </Badge>
          </div>
        </div>

        {/* Main Player Spotlight */}
        <div className="grid grid-cols-3 gap-8 items-center mb-8">
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

          {/* Player Stats */}
          <Card className="bg-black/40 backdrop-blur border-white/20 p-8">
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-3xl font-bold text-white mb-2">Current Rank</h4>
                <Badge variant="outline" className="text-2xl px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none">
                  {currentPlayer.users.current_rank}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-lg text-slate-300">Rank Points</p>
                  <p className="text-2xl font-bold text-white">{currentPlayer.users.rank_points || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-lg text-slate-300">Weight Rating</p>
                  <p className="text-2xl font-bold text-white">{currentPlayer.users.weight_rating || 'N/A'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Team Roster Preview */}
          <div className="space-y-4">
            <h4 className="text-2xl font-bold text-white text-center mb-4">Team Roster</h4>
            <div className="space-y-3">
              {currentTeam.team_members.map((member, index) => (
                <div 
                  key={member.user_id}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 cursor-pointer ${
                    index === currentPlayerInTeam 
                      ? 'bg-white/20 border border-white/40 scale-105' 
                      : 'bg-black/20 hover:bg-black/30 hover:scale-102'
                  }`}
                  onClick={() => {
                    setCurrentPlayerInTeam(index);
                    onPlayerClick?.(index);
                  }}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.users.discord_avatar_url || undefined} />
                    <AvatarFallback className="text-sm">
                      {member.users.discord_username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {member.users.discord_username}
                    </p>
                    <p className="text-sm text-slate-300">{member.users.current_rank}</p>
                  </div>
                  {member.is_captain && (
                    <Badge variant="secondary" className="text-xs">C</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
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