import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Users, Zap } from "lucide-react";
import type { Team } from "@/types/tournamentDetail";

interface MatchPredictionsProps {
  teams: Team[];
  className?: string;
}

export default function MatchPredictions({ teams, className = "" }: MatchPredictionsProps) {
  if (teams.length < 2) return null;

  // Get top 2 teams for prediction
  const topTeams = [...teams]
    .sort((a, b) => (b.total_rank_points || 0) - (a.total_rank_points || 0))
    .slice(0, 2);

  const [team1, team2] = topTeams;

  // Calculate prediction based on multiple factors
  const calculateWinProbability = (teamA: Team, teamB: Team) => {
    const pointsA = teamA.total_rank_points || 0;
    const pointsB = teamB.total_rank_points || 0;
    
    // Get adaptive weights if available
    const avgWeightA = teamA.team_members.reduce((sum, member) => {
      const weight = (member.users as any).adaptive_weight || member.users.weight_rating || member.users.rank_points || 150;
      return sum + weight;
    }, 0) / teamA.team_members.length;
    
    const avgWeightB = teamB.team_members.reduce((sum, member) => {
      const weight = (member.users as any).adaptive_weight || member.users.weight_rating || member.users.rank_points || 150;
      return sum + weight;
    }, 0) / teamB.team_members.length;
    
    // Combine factors with weights
    const totalStrengthA = (pointsA * 0.6) + (avgWeightA * 0.4);
    const totalStrengthB = (pointsB * 0.6) + (avgWeightB * 0.4);
    
    const total = totalStrengthA + totalStrengthB;
    const probabilityA = total > 0 ? (totalStrengthA / total) * 100 : 50;
    
    return {
      teamA: Math.round(probabilityA),
      teamB: Math.round(100 - probabilityA)
    };
  };

  const prediction = calculateWinProbability(team1, team2);
  const favoredTeam = prediction.teamA > prediction.teamB ? team1 : team2;
  const favoredPercentage = Math.max(prediction.teamA, prediction.teamB);

  const getConfidenceLevel = (percentage: number) => {
    if (percentage >= 70) return { level: "High", color: "text-green-400" };
    if (percentage >= 60) return { level: "Medium", color: "text-yellow-400" };
    return { level: "Low", color: "text-red-400" };
  };

  const confidence = getConfidenceLevel(favoredPercentage);

  const getTeamStats = (team: Team) => {
    const avgWeight = team.team_members.reduce((sum, member) => {
      const weight = (member.users as any).adaptive_weight || member.users.weight_rating || member.users.rank_points || 150;
      return sum + weight;
    }, 0) / team.team_members.length;

    const captainCount = team.team_members.filter(m => m.is_captain).length;
    const hasAdaptiveWeights = team.team_members.some(m => (m.users as any).adaptive_weight);

    return {
      avgWeight: Math.round(avgWeight),
      captainCount,
      hasAdaptiveWeights,
      teamSize: team.team_members.length
    };
  };

  const team1Stats = getTeamStats(team1);
  const team2Stats = getTeamStats(team2);

  return (
    <div className={`absolute bottom-4 right-4 z-10 ${className}`}>
      <Card className="bg-black/80 backdrop-blur border-white/20 p-6 min-w-96">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
            Match Prediction
          </h3>
          <Badge className={`${confidence.color} bg-transparent border-current`}>
            {confidence.level} Confidence
          </Badge>
        </div>

        {/* Main Prediction */}
        <div className="grid grid-cols-3 gap-4 items-center mb-6">
          {/* Team 1 */}
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-2">{team1.name}</h4>
            <div className={`text-3xl font-bold ${prediction.teamA > 50 ? 'text-green-400' : 'text-red-400'}`}>
              {prediction.teamA}%
            </div>
            <Badge variant="outline" className="mt-2 text-xs">
              Seed #{team1.seed || 'N/A'}
            </Badge>
          </div>

          {/* VS */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-2">
              <span className="text-lg font-bold text-white">VS</span>
            </div>
            <div className="text-xs text-slate-400">
              {favoredTeam.name} favored
            </div>
          </div>

          {/* Team 2 */}
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-2">{team2.name}</h4>
            <div className={`text-3xl font-bold ${prediction.teamB > 50 ? 'text-green-400' : 'text-red-400'}`}>
              {prediction.teamB}%
            </div>
            <Badge variant="outline" className="mt-2 text-xs">
              Seed #{team2.seed || 'N/A'}
            </Badge>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
            <span className="flex items-center text-slate-300">
              <Target className="w-3 h-3 mr-1" />
              Total Points:
            </span>
            <div className="flex space-x-4">
              <span className="text-white">{team1.total_rank_points}</span>
              <span className="text-slate-500">vs</span>
              <span className="text-white">{team2.total_rank_points}</span>
            </div>
          </div>

          <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
            <span className="flex items-center text-slate-300">
              <TrendingUp className="w-3 h-3 mr-1" />
              Avg Weight:
            </span>
            <div className="flex space-x-4">
              <span className="text-white">{team1Stats.avgWeight}</span>
              <span className="text-slate-500">vs</span>
              <span className="text-white">{team2Stats.avgWeight}</span>
            </div>
          </div>

          <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
            <span className="flex items-center text-slate-300">
              <Users className="w-3 h-3 mr-1" />
              Team Size:
            </span>
            <div className="flex space-x-4">
              <span className="text-white">{team1Stats.teamSize}</span>
              <span className="text-slate-500">vs</span>
              <span className="text-white">{team2Stats.teamSize}</span>
            </div>
          </div>

          {(team1Stats.hasAdaptiveWeights || team2Stats.hasAdaptiveWeights) && (
            <div className="text-center p-2 bg-purple-900/30 rounded">
              <p className="text-purple-200 text-xs">
                {team1Stats.hasAdaptiveWeights && team2Stats.hasAdaptiveWeights 
                  ? "Both teams using adaptive weight system"
                  : `${team1Stats.hasAdaptiveWeights ? team1.name : team2.name} using adaptive weights`}
              </p>
            </div>
          )}
        </div>

        {/* Algorithm Note */}
        <div className="mt-4 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            Prediction based on team points (60%) + average weight (40%)
          </p>
        </div>
      </Card>
    </div>
  );
}