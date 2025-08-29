import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Info, BarChart3 } from "lucide-react";
import type { Team } from "@/types/tournamentDetail";
import type { TransitionType } from "@/hooks/useBroadcastScene";
import WeightBreakdownModal from "./WeightBreakdownModal";
import PlayerSocialsDisplay from "./PlayerSocialsDisplay";

interface TeamShowcaseProps {
  teams: Team[];
  currentTeamIndex: number;
  currentPlayerIndex: number;
  transition: TransitionType;
  tournamentId?: string;
  onPlayerClick?: (playerIndex: number) => void;
  onTeamClick?: (teamIndex: number) => void;
}

export default function TeamShowcase({ 
  teams, 
  currentTeamIndex, 
  currentPlayerIndex, 
  transition,
  tournamentId,
  onPlayerClick,
  onTeamClick 
}: TeamShowcaseProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentPlayerInTeam, setCurrentPlayerInTeam] = useState(0);
  const [showWeightBreakdown, setShowWeightBreakdown] = useState(false);

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
      <div className="w-full max-w-7xl mx-auto px-4 flex items-center justify-center min-h-0">
        <div className="w-full space-y-8">
          {/* Team Header */}
          <div className="text-center">
            <h1 
              className="text-6xl md:text-8xl font-bold text-white mb-4 drop-shadow-lg cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onTeamClick?.(currentTeamIndex)}
            >
              {currentTeam.name}
            </h1>
            <div className="flex items-center justify-center space-x-4 md:space-x-8">
              <Badge variant="secondary" className="text-xl md:text-2xl px-4 md:px-6 py-2">
                Seed #{currentTeam.seed || 'N/A'}
              </Badge>
              <Badge variant="outline" className="text-xl md:text-2xl px-4 md:px-6 py-2">
                {currentTeam.total_rank_points} Points
              </Badge>
            </div>
          </div>

          {/* Main Player Spotlight */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Player Avatar & Info */}
            <div className="flex flex-col items-center lg:col-span-1">
              <Avatar 
                className="w-32 h-32 md:w-48 md:h-48 mb-4 md:mb-6 border-4 border-white shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onPlayerClick?.(currentPlayerInTeam)}
              >
                <AvatarImage src={currentPlayer.users.discord_avatar_url || undefined} />
                <AvatarFallback className="text-2xl md:text-4xl bg-gradient-to-br from-slate-700 to-slate-600">
                  {currentPlayer.users.discord_username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 
                className="text-2xl md:text-4xl font-bold text-white text-center cursor-pointer hover:text-blue-300 transition-colors"
                onClick={() => onPlayerClick?.(currentPlayerInTeam)}
              >
                {currentPlayer.users.discord_username}
              </h3>
              {currentPlayer.users.riot_id && (
                <p className="text-lg md:text-2xl text-slate-300 mt-2">{currentPlayer.users.riot_id}</p>
              )}
              {currentPlayer.is_captain && (
                <Badge className="mt-4 text-lg md:text-xl px-4 py-1 bg-yellow-600 hover:bg-yellow-500">
                  Team Captain
                </Badge>
              )}
              
              {/* Weight Breakdown Button */}
              {((currentPlayer.users as any).adaptive_weight || currentPlayer.users.weight_rating) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 bg-purple-600/20 border-purple-400 text-purple-300 hover:bg-purple-600/40"
                  onClick={() => setShowWeightBreakdown(true)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Weight Breakdown
                </Button>
              )}
            </div>

            {/* Player Stats */}
            <Card className="bg-black/40 backdrop-blur border-white/20 p-4 md:p-8 h-full lg:col-span-2">
              <div className="space-y-4 md:space-y-6 h-full flex flex-col">
                <div className="text-center">
                  <h4 className="text-2xl md:text-3xl font-bold text-white mb-2">Current Rank</h4>
                  <Badge variant="outline" className="text-lg md:text-2xl px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none">
                    {currentPlayer.users.current_rank}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center flex-1">
                  <div>
                    <p className="text-sm md:text-lg text-slate-300">Rank Points</p>
                    <p className="text-xl md:text-2xl font-bold text-white">{currentPlayer.users.rank_points || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm md:text-lg text-slate-300">
                      {(currentPlayer.users as any).adaptive_weight ? 'Tournament Weight' : 'Weight Rating'}
                    </p>
                    <p className="text-xl md:text-2xl font-bold text-purple-300">
                      {(currentPlayer.users as any).adaptive_weight || currentPlayer.users.weight_rating || 'N/A'}
                    </p>
                  </div>
                  
                  {/* Additional player stats */}
                  {(currentPlayer.users as any).wins !== undefined && (
                    <div>
                      <p className="text-sm md:text-lg text-slate-300">Match Wins</p>
                      <p className="text-xl md:text-2xl font-bold text-green-400">{(currentPlayer.users as any).wins || 0}</p>
                    </div>
                  )}
                  
                  {(currentPlayer.users as any).tournaments_played !== undefined && (
                    <div>
                      <p className="text-sm md:text-lg text-slate-300">Tournaments</p>
                      <p className="text-xl md:text-2xl font-bold text-blue-400">{(currentPlayer.users as any).tournaments_played || 0}</p>
                    </div>
                  )}
                </div>
                
                {/* Peak rank info */}
                {(currentPlayer.users as any).peak_rank_points && (
                  <div className="text-center mt-4 p-3 bg-purple-900/30 rounded-lg">
                    <p className="text-sm text-purple-200 font-semibold">
                      Peak: {(currentPlayer.users as any).peak_rank_points} pts
                    </p>
                    {(currentPlayer.users as any).adaptive_factor && (
                      <p className="text-xs text-purple-300">
                        Adaptive Factor: {((currentPlayer.users as any).adaptive_factor * 100).toFixed(1)}%
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-purple-300 hover:text-purple-100"
                      onClick={() => setShowWeightBreakdown(true)}
                    >
                      <Info className="w-3 h-3 mr-1" />
                      Details
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Player Socials */}
            <div className="lg:col-span-1">
              <PlayerSocialsDisplay 
                player={currentPlayer} 
                className="h-full flex flex-col justify-center"
              />
            </div>
          </div>

          {/* Team Roster Preview */}
          <div className="mt-8">
            <h4 className="text-xl md:text-2xl font-bold text-white text-center mb-4">Team Roster</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {currentTeam.team_members.map((member, index) => (
                <div 
                  key={member.user_id}
                  className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-all duration-300 cursor-pointer ${
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
                  <div className="text-center min-w-0">
                    <p className="text-white font-medium truncate text-sm">
                      {member.users.discord_username}
                    </p>
                    <p className="text-xs text-slate-300">{member.users.current_rank}</p>
                    {member.is_captain && (
                      <Badge variant="secondary" className="text-xs mt-1">C</Badge>
                    )}
                  </div>
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

      {/* Weight Breakdown Modal */}
      <WeightBreakdownModal
        open={showWeightBreakdown}
        onOpenChange={setShowWeightBreakdown}
        player={currentPlayer}
        tournamentId={tournamentId}
      />
    </div>
  );
}