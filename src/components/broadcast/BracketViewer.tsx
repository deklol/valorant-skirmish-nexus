import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, MapPin, Clock } from "lucide-react";
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

  // Get real matches from window (set by useBroadcastData)
  const matches = (window as any).broadcastMatches || [];
  
  const getRoundName = (roundNumber: number, totalRounds: number) => {
    if (roundNumber === totalRounds) return 'Final';
    if (roundNumber === totalRounds - 1) return 'Semi-Final';
    if (roundNumber === totalRounds - 2) return 'Quarter-Final';
    return `Round ${roundNumber}`;
  };

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

  // Group matches by round
  const maxRound = Math.max(...matches.map((m: any) => m.round_number), 0);
  const matchesByRound: Record<number, any[]> = {};
  matches.forEach((match: any) => {
    if (!matchesByRound[match.round_number]) {
      matchesByRound[match.round_number] = [];
    }
    matchesByRound[match.round_number].push(match);
  });

  if (matches.length === 0) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${transitionClasses[transition]}`}>
        <div className="text-center">
          <Trophy className="w-24 h-24 text-slate-500 mx-auto mb-4" />
          <h2 className="text-4xl font-bold text-white mb-2">No Bracket Data</h2>
          <p className="text-xl text-slate-400">Tournament bracket is not yet available</p>
        </div>
      </div>
    );
  }

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
          <p className="text-2xl text-slate-300">Live Championship Results</p>
        </div>

        {/* Bracket Layout */}
        <div className={`grid gap-8 ${Object.keys(matchesByRound).length <= 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-4'}`}>
          {Object.entries(matchesByRound)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([roundNum, roundMatches]) => {
              const roundNumber = parseInt(roundNum);
              const roundName = getRoundName(roundNumber, maxRound);
              
              return (
                <div key={roundNum} className="space-y-6">
                  <h2 className="text-3xl font-bold text-white text-center mb-6">{roundName}</h2>
                  {roundMatches.map((match: any) => (
                    <Card 
                      key={match.id}
                      className={`bg-gradient-to-r ${getRoundColor(roundName)} p-6 cursor-pointer hover:scale-105 transition-all duration-300 ${
                        match.status === 'live' ? 'ring-4 ring-red-500 animate-pulse' : ''
                      } ${roundName === 'Final' ? 'border-4 border-yellow-400' : ''}`}
                      onClick={() => onMatchClick?.(match.id)}
                    >
                      <div className="text-white">
                        {match.status === 'live' && (
                          <div className="flex items-center justify-center mb-3">
                            <Badge className="bg-red-600 text-white animate-pulse">
                              🔴 LIVE
                            </Badge>
                          </div>
                        )}
                        
                        {roundName === 'Final' && (
                          <div className="text-center mb-4">
                            <Trophy className="w-8 h-8 mx-auto text-yellow-300" />
                          </div>
                        )}
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <span className="font-bold text-lg block">
                                {match.team1?.name || 'TBD'}
                              </span>
                              {match.winner_id === match.team1_id && match.status === 'completed' && (
                                <Badge className="mt-1 bg-yellow-600 text-xs">Winner</Badge>
                              )}
                            </div>
                            <span className="text-2xl font-bold ml-4">
                              {match.score_team1 || 0}
                            </span>
                          </div>
                          
                          <div className="text-center">
                            <span className="text-sm opacity-75">VS</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <span className="font-bold text-lg block">
                                {match.team2?.name || 'TBD'}
                              </span>
                              {match.winner_id === match.team2_id && match.status === 'completed' && (
                                <Badge className="mt-1 bg-yellow-600 text-xs">Winner</Badge>
                              )}
                            </div>
                            <span className="text-2xl font-bold ml-4">
                              {match.score_team2 || 0}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4 text-center">
                          <Badge variant="outline" className="text-white border-white/50">
                            {match.status === 'completed' && '✓ Complete'}
                            {match.status === 'live' && '⏱️ In Progress'}
                            {match.status === 'pending' && '⏳ Scheduled'}
                          </Badge>
                          
                          {match.scheduled_time && match.status === 'pending' && (
                            <div className="flex items-center justify-center mt-2 text-xs text-slate-200">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(match.scheduled_time).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })}
        </div>

        {/* Tournament Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12 max-w-2xl mx-auto">
          <Card className="bg-black/40 backdrop-blur border-white/20 p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <p className="text-sm text-slate-300">Total Matches</p>
            <p className="text-xl font-bold text-white">{matches.length}</p>
          </Card>

          <Card className="bg-black/40 backdrop-blur border-white/20 p-4 text-center">
            <MapPin className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-sm text-slate-300">Completed</p>
            <p className="text-xl font-bold text-white">
              {matches.filter((m: any) => m.status === 'completed').length}
            </p>
          </Card>

          <Card className="bg-black/40 backdrop-blur border-white/20 p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
            <p className="text-sm text-slate-300">Live Matches</p>
            <p className="text-xl font-bold text-white">
              {matches.filter((m: any) => m.status === 'live').length}
            </p>
          </Card>
        </div>

        {/* Navigation Hint */}
        <div className="text-center mt-8">
          <p className="text-lg text-slate-400">
            Click on any match for detailed information • Use arrow keys to navigate
          </p>
        </div>
      </div>
    </div>
  );
}