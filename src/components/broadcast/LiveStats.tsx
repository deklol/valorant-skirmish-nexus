import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, TrendingUp, Clock } from "lucide-react";
import type { Team } from "@/types/tournamentDetail";

interface LiveStatsProps {
  teams: Team[];
  className?: string;
}

export default function LiveStats({ teams, className = "" }: LiveStatsProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate tournament statistics
  const totalPlayers = teams.reduce((sum, team) => sum + team.team_members.length, 0);
  const totalRankPoints = teams.reduce((sum, team) => sum + team.total_rank_points, 0);
  const avgRankPoints = totalPlayers > 0 ? Math.round(totalRankPoints / totalPlayers) : 0;

  // Calculate rank distribution
  const rankDistribution = teams.reduce((acc, team) => {
    team.team_members.forEach(member => {
      const rank = member.users.current_rank;
      acc[rank] = (acc[rank] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topRanks = Object.entries(rankDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  // Calculate highest weighted player
  const allPlayers = teams.flatMap(team => 
    team.team_members.map(member => ({
      ...member,
      teamName: team.name,
      weight: (member.users as any).adaptive_weight || member.users.weight_rating || 150
    }))
  );

  const topPlayer = allPlayers.reduce((prev, current) => 
    prev.weight > current.weight ? prev : current
  );

  const getRegionFromTime = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 18) return "NA East";
    if (hour >= 18 && hour < 24) return "NA West";
    return "EU/APAC";
  };

  return (
    <Card className={`bg-black/90 backdrop-blur border-white/20 text-white p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-bold">Live Tournament Stats</h3>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-300">LIVE</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-300">Total Players</span>
            </div>
            <p className="text-2xl font-bold">{totalPlayers}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-300">Avg Rating</span>
            </div>
            <p className="text-2xl font-bold">{avgRankPoints}</p>
          </div>
        </div>

        {/* Rank Distribution */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Top Ranks</h4>
          <div className="space-y-1">
            {topRanks.map(([rank, count]) => (
              <div key={rank} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{rank}</span>
                <Badge variant="outline" className="text-xs">
                  {count} player{count !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Rated Player */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <h4 className="text-sm font-medium text-slate-300">Highest Rated</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{topPlayer.users.discord_username}</p>
              <p className="text-xs text-slate-400">{topPlayer.teamName}</p>
            </div>
            <Badge className="bg-yellow-600 hover:bg-yellow-500">
              {topPlayer.weight} pts
            </Badge>
          </div>
        </div>

        {/* Live Info */}
        <div className="pt-2 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>
            <div className="text-right">
              <span>Region: {getRegionFromTime()}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}