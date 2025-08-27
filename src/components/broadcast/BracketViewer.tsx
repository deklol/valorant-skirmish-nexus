import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, MapPin } from "lucide-react";
import type { TransitionType } from "@/hooks/useBroadcastScene";

interface BracketViewerProps {
  tournamentId: string;
  transition: TransitionType;
  onMatchClick?: (matchId: string) => void;
}

export default function BracketViewer({ tournamentId, transition, onMatchClick }: BracketViewerProps) {
  const transitionClasses = {
    fade: "animate-fade-in",
    slide: "transform transition-transform duration-500",
    cascade: "animate-fade-in"
  };

  // Mock bracket data - in a real implementation, this would come from the tournament data
  const mockMatches = [
    {
      id: '1',
      round: 'Final',
      team1: 'Team Alpha',
      team2: 'Team Beta',
      score1: 2,
      score2: 1,
      status: 'completed',
      isLive: false
    },
    {
      id: '2',
      round: 'Semi-Final',
      team1: 'Team Alpha',
      team2: 'Team Gamma',
      score1: 2,
      score2: 0,
      status: 'completed',
      isLive: false
    },
    {
      id: '3',
      round: 'Semi-Final',
      team1: 'Team Beta',
      team2: 'Team Delta',
      score1: 2,
      score2: 1,
      status: 'completed',
      isLive: false
    },
    {
      id: '4',
      round: 'Quarter-Final',
      team1: 'Team Alpha',
      team2: 'Team Echo',
      score1: 2,
      score2: 0,
      status: 'completed',
      isLive: false
    },
    {
      id: '5',
      round: 'Quarter-Final',
      team1: 'Team Gamma',
      team2: 'Team Foxtrot',
      score1: 2,
      score2: 1,
      status: 'live',
      isLive: true
    }
  ];

  const getRoundColor = (round: string) => {
    switch (round.toLowerCase()) {
      case 'final':
        return 'from-yellow-500 to-orange-500';
      case 'semi-final':
        return 'from-purple-500 to-pink-500';
      case 'quarter-final':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className={`w-full h-full flex items-center justify-center p-8 ${transitionClasses[transition]}`}>
      <div className="max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Trophy className="w-16 h-16 text-yellow-400" />
            <h1 className="text-6xl font-bold text-white drop-shadow-lg">
              Tournament Bracket
            </h1>
            <Trophy className="w-16 h-16 text-yellow-400" />
          </div>
          <p className="text-2xl text-slate-300">Championship Overview</p>
        </div>

        {/* Bracket Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quarter Finals */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white text-center mb-6">Quarter Finals</h2>
            {mockMatches.filter(match => match.round === 'Quarter-Final').map((match) => (
              <Card 
                key={match.id}
                className={`bg-gradient-to-r ${getRoundColor(match.round)} p-6 cursor-pointer hover:scale-105 transition-all duration-300 ${
                  match.isLive ? 'ring-4 ring-red-500 animate-pulse' : ''
                }`}
                onClick={() => onMatchClick?.(match.id)}
              >
                <div className="text-white">
                  {match.isLive && (
                    <div className="flex items-center justify-center mb-3">
                      <Badge className="bg-red-600 text-white animate-pulse">
                        🔴 LIVE
                      </Badge>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">{match.team1}</span>
                      <span className="text-2xl font-bold">{match.score1}</span>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-sm opacity-75">VS</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">{match.team2}</span>
                      <span className="text-2xl font-bold">{match.score2}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <Badge variant="outline" className="text-white border-white/50">
                      {match.status === 'completed' ? '✓ Complete' : '⏱️ In Progress'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Semi Finals */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white text-center mb-6">Semi Finals</h2>
            {mockMatches.filter(match => match.round === 'Semi-Final').map((match) => (
              <Card 
                key={match.id}
                className={`bg-gradient-to-r ${getRoundColor(match.round)} p-8 cursor-pointer hover:scale-105 transition-all duration-300`}
                onClick={() => onMatchClick?.(match.id)}
              >
                <div className="text-white">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xl">{match.team1}</span>
                      <span className="text-3xl font-bold">{match.score1}</span>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-lg opacity-75">VS</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xl">{match.team2}</span>
                      <span className="text-3xl font-bold">{match.score2}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 text-center">
                    <Badge variant="outline" className="text-white border-white/50 text-lg px-4 py-1">
                      ✓ Complete
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Finals */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white text-center mb-6">Championship</h2>
            {mockMatches.filter(match => match.round === 'Final').map((match) => (
              <Card 
                key={match.id}
                className={`bg-gradient-to-r ${getRoundColor(match.round)} p-10 cursor-pointer hover:scale-105 transition-all duration-300 border-4 border-yellow-400`}
                onClick={() => onMatchClick?.(match.id)}
              >
                <div className="text-white text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <span className="font-bold text-2xl block">{match.team1}</span>
                        {match.score1 > match.score2 && (
                          <Badge className="mt-2 bg-yellow-600">🏆 Champion</Badge>
                        )}
                      </div>
                      <span className="text-4xl font-bold">{match.score1}</span>
                    </div>
                    
                    <div className="text-center py-2">
                      <span className="text-xl opacity-75">FINAL</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <span className="font-bold text-2xl block">{match.team2}</span>
                        {match.score2 > match.score1 && (
                          <Badge className="mt-2 bg-yellow-600">🏆 Champion</Badge>
                        )}
                      </div>
                      <span className="text-4xl font-bold">{match.score2}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Tournament Stats */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <Card className="bg-black/40 backdrop-blur border-white/20 p-4 text-center cursor-pointer hover:scale-105 transition-transform">
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <p className="text-sm text-slate-300">Total Teams</p>
                <p className="text-2xl font-bold text-white">8</p>
              </Card>

              <Card className="bg-black/40 backdrop-blur border-white/20 p-4 text-center cursor-pointer hover:scale-105 transition-transform">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm text-slate-300">Matches Played</p>
                <p className="text-2xl font-bold text-white">7</p>
              </Card>
            </div>
          </div>
        </div>

        {/* Navigation Hint */}
        <div className="text-center mt-12">
          <p className="text-lg text-slate-400">
            Click on any match for detailed information
          </p>
        </div>
      </div>
    </div>
  );
}