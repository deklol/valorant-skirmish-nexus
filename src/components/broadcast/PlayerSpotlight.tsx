import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Target, TrendingUp } from "lucide-react";
import type { Team } from "@/types/tournamentDetail";
import type { TransitionType } from "@/hooks/useBroadcastScene";

interface PlayerSpotlightProps {
  teams: Team[];
  currentPlayerIndex: number;
  transition: TransitionType;
  onPlayerClick?: (playerIndex: number) => void;
  onTeamClick?: (teamIndex: number) => void;
}

export default function PlayerSpotlight({ teams, currentPlayerIndex, transition, onPlayerClick, onTeamClick }: PlayerSpotlightProps) {
  // Flatten all players and sort by rank points
  const allPlayers = teams.flatMap((team, teamIndex) => 
    team.team_members.map(member => ({
      ...member,
      teamName: team.name,
      teamSeed: team.seed,
      teamIndex
    }))
  ).sort((a, b) => (b.users.rank_points || 150) - (a.users.rank_points || 150));

  const currentPlayer = allPlayers[currentPlayerIndex];
  
  if (!currentPlayer) return null;

  const getRankColor = (rank: string) => {
    const lowerRank = rank.toLowerCase();
    if (lowerRank.includes('radiant')) return 'from-yellow-400 to-orange-500';
    if (lowerRank.includes('immortal')) return 'from-purple-500 to-pink-500';
    if (lowerRank.includes('ascendant')) return 'from-green-400 to-blue-500';
    if (lowerRank.includes('diamond')) return 'from-blue-400 to-purple-500';
    if (lowerRank.includes('platinum')) return 'from-teal-400 to-blue-400';
    if (lowerRank.includes('gold')) return 'from-yellow-500 to-orange-400';
    if (lowerRank.includes('silver')) return 'from-gray-300 to-gray-500';
    if (lowerRank.includes('bronze')) return 'from-orange-600 to-red-600';
    return 'from-gray-600 to-gray-800';
  };

  const transitionClasses = {
    fade: "animate-fade-in",
    slide: "transform transition-transform duration-500",
    cascade: "animate-fade-in"
  };

  const playerRank = currentPlayerIndex + 1;
  const isTopPlayer = playerRank <= 3;

  return (
    <div className={`w-full h-full flex items-center justify-center ${transitionClasses[transition]}`}>
      <div className="max-w-6xl w-full mx-auto px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-4">
            {isTopPlayer && <Crown className="w-12 h-12 text-yellow-400" />}
            <h1 className="text-6xl font-bold text-white drop-shadow-lg">
              Player Spotlight
            </h1>
            {isTopPlayer && <Crown className="w-12 h-12 text-yellow-400" />}
          </div>
          <p className="text-2xl text-slate-300">
            #{playerRank} Tournament Player
          </p>
        </div>

        <div className="grid grid-cols-2 gap-12 items-center">
          {/* Player Info */}
          <div className="text-center">
            {/* Ranking Badge */}
            <div className="mb-8">
              <Badge 
                variant="outline" 
                className={`text-2xl px-6 py-3 bg-gradient-to-r ${
                  playerRank === 1 ? 'from-yellow-400 to-orange-500' :
                  playerRank === 2 ? 'from-gray-300 to-gray-500' :
                  playerRank === 3 ? 'from-orange-600 to-red-600' :
                  'from-blue-500 to-purple-500'
                } text-white border-none`}
              >
                {playerRank === 1 ? '🥇 #1 Player' :
                 playerRank === 2 ? '🥈 #2 Player' :
                 playerRank === 3 ? '🥉 #3 Player' :
                 `#${playerRank} Player`}
              </Badge>
            </div>

            {/* Avatar */}
            <Avatar 
              className="w-64 h-64 mx-auto mb-8 border-8 border-white shadow-2xl cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onPlayerClick?.(currentPlayerIndex)}
            >
              <AvatarImage src={currentPlayer.users.discord_avatar_url || undefined} />
              <AvatarFallback className="text-6xl bg-gradient-to-br from-slate-700 to-slate-600">
                {currentPlayer.users.discord_username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Player Name */}
            <h2 
              className="text-5xl font-bold text-white mb-4 cursor-pointer hover:text-purple-300 transition-colors"
              onClick={() => onPlayerClick?.(currentPlayerIndex)}
            >
              {currentPlayer.users.discord_username}
            </h2>

            {/* Riot ID */}
            {currentPlayer.users.riot_id && (
              <p className="text-2xl text-slate-300 mb-6">{currentPlayer.users.riot_id}</p>
            )}

            {/* Team Info */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Badge 
                variant="secondary" 
                className="text-xl px-4 py-2 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onTeamClick?.(currentPlayer.teamIndex)}
              >
                {currentPlayer.teamName}
              </Badge>
              {currentPlayer.is_captain && (
                <Badge className="text-xl px-4 py-2 bg-yellow-600 hover:bg-yellow-500">
                  Team Captain
                </Badge>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="space-y-6">
            {/* Main Rank Card */}
            <Card className={`bg-gradient-to-br ${getRankColor(currentPlayer.users.current_rank)} p-8 cursor-pointer hover:scale-105 transition-transform`}>
              <div className="text-center text-white">
                <Target className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-3xl font-bold mb-2">Current Rank</h3>
                <p className="text-4xl font-bold">{currentPlayer.users.current_rank}</p>
              </div>
            </Card>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-black/40 backdrop-blur border-white/20 p-6 text-center cursor-pointer hover:scale-105 transition-transform">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-lg text-slate-300">Rank Points</p>
                <p className="text-3xl font-bold text-white">
                  {currentPlayer.users.rank_points || 'N/A'}
                </p>
              </Card>

              <Card className="bg-black/40 backdrop-blur border-white/20 p-6 text-center cursor-pointer hover:scale-105 transition-transform">
                <Target className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <p className="text-lg text-slate-300">Weight Rating</p>
                <p className="text-3xl font-bold text-white">
                  {currentPlayer.users.weight_rating || 'N/A'}
                </p>
              </Card>

              <Card 
                className="bg-black/40 backdrop-blur border-white/20 p-6 text-center col-span-2 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onTeamClick?.(currentPlayer.teamIndex)}
              >
                <Crown className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <p className="text-lg text-slate-300">Team Seed</p>
                <p className="text-3xl font-bold text-white">
                  #{currentPlayer.teamSeed || 'N/A'}
                </p>
              </Card>
            </div>

            {/* Tournament Ranking */}
            <Card className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur border-purple-400/30 p-6 cursor-pointer hover:scale-105 transition-transform">
              <div className="text-center text-white" onClick={() => onTeamClick?.(currentPlayer.teamIndex)}>
                <h4 className="text-2xl font-bold mb-2">Tournament Standing</h4>
                <div className="flex justify-center items-center space-x-4">
                  <span className="text-4xl font-bold">#{playerRank}</span>
                  <span className="text-lg text-slate-300">of {allPlayers.length} players</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="text-center mt-12">
          <p className="text-xl text-slate-300 mb-2">
            Player {currentPlayerIndex + 1} of {allPlayers.length}
          </p>
          <div className="flex justify-center space-x-1">
            {allPlayers.slice(0, Math.min(10, allPlayers.length)).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer hover:scale-110 ${
                  index === currentPlayerIndex ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'
                }`}
                onClick={() => onPlayerClick?.(index)}
              />
            ))}
            {allPlayers.length > 10 && currentPlayerIndex >= 10 && (
              <span className="text-white/60 mx-2">...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}