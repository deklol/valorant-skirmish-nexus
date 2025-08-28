import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Zap, Shield } from "lucide-react";
import type { Team } from "@/types/tournamentDetail";

interface MatchPredictionsProps {
  team1: Team;
  team2: Team;
  className?: string;
}

export default function MatchPredictions({ team1, team2, className = "" }: MatchPredictionsProps) {
  // Calculate team statistics
  const calculateTeamStats = (team: Team) => {
    const members = team.team_members;
    const totalWeight = members.reduce((sum, member) => {
      return sum + ((member.users as any).adaptive_weight || member.users.weight_rating || 150);
    }, 0);
    const avgWeight = totalWeight / members.length;
    
    const rankValues: { [key: string]: number } = {
      'Iron 1': 100, 'Iron 2': 110, 'Iron 3': 120,
      'Bronze 1': 130, 'Bronze 2': 140, 'Bronze 3': 150,
      'Silver 1': 160, 'Silver 2': 170, 'Silver 3': 180,
      'Gold 1': 190, 'Gold 2': 200, 'Gold 3': 210,
      'Platinum 1': 220, 'Platinum 2': 230, 'Platinum 3': 240,
      'Diamond 1': 250, 'Diamond 2': 260, 'Diamond 3': 270,
      'Ascendant 1': 280, 'Ascendant 2': 290, 'Ascendant 3': 300,
      'Immortal 1': 310, 'Immortal 2': 320, 'Immortal 3': 330,
      'Radiant': 350
    };

    const avgRankValue = members.reduce((sum, member) => {
      return sum + (rankValues[member.users.current_rank] || 150);
    }, 0) / members.length;

    return {
      avgWeight: Math.round(avgWeight),
      avgRankValue: Math.round(avgRankValue),
      consistency: Math.round(100 - (Math.abs(avgWeight - avgRankValue) / avgWeight) * 100),
      experience: members.reduce((sum, member) => sum + (member.users.rank_points || 0), 0)
    };
  };

  const team1Stats = calculateTeamStats(team1);
  const team2Stats = calculateTeamStats(team2);

  // Calculate win probability
  const calculateWinProbability = (team1Stats: any, team2Stats: any) => {
    const weightDiff = team1Stats.avgWeight - team2Stats.avgWeight;
    const rankDiff = team1Stats.avgRankValue - team2Stats.avgRankValue;
    const expDiff = team1Stats.experience - team2Stats.experience;
    
    const totalDiff = (weightDiff * 0.4) + (rankDiff * 0.4) + (expDiff * 0.0001 * 0.2);
    const probability = 50 + (totalDiff / 10);
    
    return Math.max(15, Math.min(85, Math.round(probability)));
  };

  const team1WinProb = calculateWinProbability(team1Stats, team2Stats);
  const team2WinProb = 100 - team1WinProb;

  const getAdvantage = () => {
    const diff = Math.abs(team1Stats.avgWeight - team2Stats.avgWeight);
    if (diff < 20) return { text: "Even Match", color: "text-yellow-400", icon: Target };
    if (diff < 40) return { text: "Slight Advantage", color: "text-orange-400", icon: TrendingUp };
    return { text: "Strong Advantage", color: "text-red-400", icon: Zap };
  };

  const advantage = getAdvantage();
  const strongerTeam = team1Stats.avgWeight > team2Stats.avgWeight ? team1.name : team2.name;

  return (
    <Card className={`bg-black/90 backdrop-blur border-white/20 text-white p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Match Analysis</h3>
          <div className="flex items-center space-x-2">
            <advantage.icon className={`w-5 h-5 ${advantage.color}`} />
            <span className={`text-sm ${advantage.color}`}>{advantage.text}</span>
          </div>
        </div>

        {/* Win Probabilities */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{team1.name}</span>
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                {team1WinProb}%
              </Badge>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${team1WinProb}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{team2.name}</span>
              <Badge variant="outline" className="text-red-400 border-red-400">
                {team2WinProb}%
              </Badge>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${team2WinProb}%` }}
              />
            </div>
          </div>
        </div>

        {/* Team Stats Comparison */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div className="space-y-3">
            <h4 className="font-medium text-blue-400">{team1.name}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Avg Weight</span>
                <span>{team1Stats.avgWeight}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Consistency</span>
                <span>{team1Stats.consistency}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Experience</span>
                <span>{team1Stats.experience.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-red-400">{team2.name}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Avg Weight</span>
                <span>{team2Stats.avgWeight}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Consistency</span>
                <span>{team2Stats.consistency}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Experience</span>
                <span>{team2Stats.experience.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Key Insights</h4>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <Shield className="w-3 h-3" />
              <span>Favored: <strong className="text-white">{strongerTeam}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="w-3 h-3" />
              <span>Weight differential: {Math.abs(team1Stats.avgWeight - team2Stats.avgWeight)} points</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}