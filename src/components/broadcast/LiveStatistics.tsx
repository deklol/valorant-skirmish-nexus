import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Crown, Target, BarChart3 } from "lucide-react";
import type { Team } from "@/types/tournamentDetail";

interface LiveStatisticsProps {
  teams: Team[];
  className?: string;
}

export default function LiveStatistics({ teams, className = "" }: LiveStatisticsProps) {
  const [currentStat, setCurrentStat] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat(prev => (prev + 1) % 4); // Cycle through 4 different stats
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (teams.length === 0) return null;

  // Calculate various statistics
  const getTotalPlayers = () => teams.reduce((total, team) => total + team.team_members.length, 0);
  
  const getHighestRatedTeam = () => {
    return teams.reduce((highest, team) => 
      (team.total_rank_points || 0) > (highest.total_rank_points || 0) ? team : highest
    );
  };

  const getAverageTeamRating = () => {
    const totalPoints = teams.reduce((sum, team) => sum + (team.total_rank_points || 0), 0);
    return Math.round(totalPoints / teams.length);
  };

  const getRankDistribution = () => {
    const allPlayers = teams.flatMap(team => team.team_members);
    const rankCounts: { [key: string]: number } = {};
    
    allPlayers.forEach(player => {
      const rank = player.users.current_rank || 'Unranked';
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });

    return Object.entries(rankCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  };

  const getTopPlayer = () => {
    const allPlayers = teams.flatMap(team => 
      team.team_members.map(member => ({
        ...member,
        teamName: team.name,
        weight: (member.users as any).adaptive_weight || member.users.weight_rating || member.users.rank_points || 150
      }))
    );
    
    return allPlayers.reduce((top, player) => 
      player.weight > top.weight ? player : top
    );
  };

  const getBalanceScore = () => {
    const teamRatings = teams.map(team => team.total_rank_points || 0);
    const avg = teamRatings.reduce((sum, rating) => sum + rating, 0) / teamRatings.length;
    const variance = teamRatings.reduce((sum, rating) => sum + Math.pow(rating - avg, 2), 0) / teamRatings.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to a 0-100 scale where lower deviation = higher balance score
    const maxPossibleDev = avg * 0.5; // Assume max reasonable deviation is 50% of average
    const balanceScore = Math.max(0, Math.min(100, 100 - (standardDeviation / maxPossibleDev * 100)));
    
    return Math.round(balanceScore);
  };

  const stats = [
    {
      title: "Tournament Overview",
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{teams.length}</div>
              <div className="text-sm text-slate-300">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{getTotalPlayers()}</div>
              <div className="text-sm text-slate-300">Players</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400">{getAverageTeamRating()}</div>
            <div className="text-sm text-slate-300">Average Team Rating</div>
          </div>
        </div>
      )
    },
    {
      title: "Top Performers",
      icon: <Crown className="w-5 h-5 text-yellow-400" />,
      content: (() => {
        const topTeam = getHighestRatedTeam();
        const topPlayer = getTopPlayer();
        return (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-300 mb-1">Highest Rated Team</div>
              <div className="text-xl font-bold text-white">{topTeam.name}</div>
              <Badge variant="outline" className="text-xs mt-1">
                {topTeam.total_rank_points} points
              </Badge>
            </div>
            <div>
              <div className="text-sm text-slate-300 mb-1">Top Individual Player</div>
              <div className="text-lg font-bold text-white">{topPlayer.users.discord_username}</div>
              <div className="text-sm text-purple-300">{topPlayer.teamName}</div>
              <Badge variant="outline" className="text-xs mt-1">
                {topPlayer.weight} weight
              </Badge>
            </div>
          </div>
        );
      })()
    },
    {
      title: "Rank Distribution",
      icon: <Target className="w-5 h-5 text-blue-400" />,
      content: (
        <div className="space-y-3">
          <div className="text-sm text-slate-300 mb-2">Most Common Ranks</div>
          {getRankDistribution().map(([rank, count], index) => (
            <div key={rank} className="flex justify-between items-center">
              <Badge variant="outline" className="text-xs">
                {rank}
              </Badge>
              <div className="text-white font-semibold">
                {count} player{count !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Balance Analysis",
      icon: <TrendingUp className="w-5 h-5 text-green-400" />,
      content: (() => {
        const balanceScore = getBalanceScore();
        const balanceColor = balanceScore >= 80 ? 'text-green-400' : 
                           balanceScore >= 60 ? 'text-yellow-400' : 'text-red-400';
        return (
          <div className="space-y-3">
            <div className="text-center">
              <div className={`text-4xl font-bold ${balanceColor}`}>{balanceScore}%</div>
              <div className="text-sm text-slate-300">Team Balance Score</div>
            </div>
            <div className="text-xs text-slate-400 text-center">
              Based on team rating distribution
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-300">Team Rating Range:</div>
              <div className="flex justify-between text-xs">
                <span className="text-green-400">
                  High: {Math.max(...teams.map(t => t.total_rank_points || 0))}
                </span>
                <span className="text-red-400">
                  Low: {Math.min(...teams.map(t => t.total_rank_points || 0))}
                </span>
              </div>
            </div>
          </div>
        );
      })()
    }
  ];

  const currentStatData = stats[currentStat];

  return (
    <div className={`absolute top-4 right-4 ${className}`}>
      <Card className="bg-black/80 backdrop-blur border-white/20 p-6 min-w-80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            {currentStatData.icon}
            <span className="ml-2">{currentStatData.title}</span>
          </h3>
          <div className="flex space-x-1">
            {stats.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStat ? 'bg-white scale-125' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="min-h-[120px]">
          {currentStatData.content}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex items-center justify-center text-xs text-slate-400">
            <Users className="w-3 h-3 mr-1" />
            Live Tournament Statistics
          </div>
        </div>
      </Card>
    </div>
  );
}