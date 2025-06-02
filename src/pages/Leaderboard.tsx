
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Users } from "lucide-react";
import Header from '@/components/Header';

const Leaderboard = () => {
  // Mock leaderboard data - will be replaced with real data
  const topPlayers = [
    {
      id: 1,
      rank: 1,
      username: "ValorantPro",
      rankPoints: 2500,
      tournamentsWon: 5,
      mvpAwards: 8,
      currentRank: "Radiant",
    },
    {
      id: 2,
      rank: 2,
      username: "SkilledGamer",
      rankPoints: 2350,
      tournamentsWon: 3,
      mvpAwards: 6,
      currentRank: "Immortal 3",
    },
    {
      id: 3,
      rank: 3,
      username: "ClutchMaster",
      rankPoints: 2200,
      tournamentsWon: 4,
      mvpAwards: 5,
      currentRank: "Immortal 2",
    },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-slate-400 font-bold">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-amber-600";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
        </div>

        <Card className="bg-slate-800/90 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-white">Top Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPlayers.map((player) => (
                <div 
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(player.rank)}
                      <span className={`font-bold ${getRankColor(player.rank)}`}>
                        #{player.rank}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{player.username}</div>
                      <div className="text-sm text-slate-400">{player.currentRank}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-indigo-400">{player.rankPoints}</div>
                      <div className="text-slate-400">Points</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-400">{player.tournamentsWon}</div>
                      <div className="text-slate-400">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-yellow-400">{player.mvpAwards}</div>
                      <div className="text-slate-400">MVPs</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {topPlayers.length === 0 && (
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Rankings Yet</h3>
              <p className="text-slate-400">Rankings will appear after tournaments are completed.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
