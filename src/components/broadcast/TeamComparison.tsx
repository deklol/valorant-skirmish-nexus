import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Team } from "@/types/tournamentDetail";
import type { TransitionType } from "@/hooks/useBroadcastScene";

interface TeamComparisonProps {
  teams: Team[];
  transition: TransitionType;
}

export default function TeamComparison({ teams, transition }: TeamComparisonProps) {
  // Get top 2 teams by rank points for comparison
  const topTeams = [...teams]
    .sort((a, b) => (b.total_rank_points || 0) - (a.total_rank_points || 0))
    .slice(0, 2);

  const [team1, team2] = topTeams;

  if (!team1 || !team2) return null;

  const calculateAverageRank = (team: Team) => {
    const totalPoints = team.team_members.reduce((sum, member) => sum + (member.users.rank_points || 150), 0);
    return Math.round(totalPoints / team.team_members.length);
  };

  const transitionClasses = {
    fade: "animate-fade-in",
    slide: "transform transition-transform duration-500",
    cascade: "animate-fade-in"
  };

  return (
    <div className={`w-full h-full flex items-center justify-center ${transitionClasses[transition]}`}>
      <div className="max-w-7xl w-full mx-auto px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Team Comparison
          </h1>
          <p className="text-2xl text-slate-300">Head-to-Head Analysis</p>
        </div>

        {/* Main Comparison */}
        <div className="grid grid-cols-3 gap-8 items-center">
          {/* Team 1 */}
          <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 backdrop-blur border-blue-400/30 p-8 h-full">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-bold text-white mb-2">{team1.name}</h2>
              <Badge variant="outline" className="text-xl px-4 py-1 bg-blue-600/30 border-blue-400">
                Seed #{team1.seed || 'N/A'}
              </Badge>
            </div>

            {/* Team Stats */}
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg text-slate-300">Total Points</p>
                <p className="text-3xl font-bold text-white">{team1.total_rank_points}</p>
              </div>
              <div className="text-center">
                <p className="text-lg text-slate-300">Average Rank Points</p>
                <p className="text-2xl font-bold text-blue-300">{calculateAverageRank(team1)}</p>
              </div>
              <div className="text-center">
                <p className="text-lg text-slate-300">Team Size</p>
                <p className="text-2xl font-bold text-white">{team1.team_members.length}</p>
              </div>
            </div>

            {/* Team Members */}
            <div className="mt-8">
              <h4 className="text-xl font-bold text-white mb-4 text-center">Roster</h4>
              <div className="space-y-3">
                {team1.team_members.map((member) => (
                  <div key={member.user_id} className="flex items-center space-x-3 p-2 rounded bg-black/20">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.users.discord_avatar_url || undefined} />
                      <AvatarFallback className="text-sm">
                        {member.users.discord_username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate text-sm">
                        {member.users.discord_username}
                      </p>
                      <p className="text-xs text-slate-300">{member.users.current_rank}</p>
                    </div>
                    {member.is_captain && (
                      <Badge variant="secondary" className="text-xs">C</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* VS Section */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-red-600 to-purple-600 rounded-full w-32 h-32 mx-auto flex items-center justify-center mb-8 shadow-2xl">
              <span className="text-4xl font-bold text-white">VS</span>
            </div>
            
            {/* Quick Stats Comparison */}
            <div className="space-y-4">
              <div className="bg-black/40 backdrop-blur rounded-lg p-4">
                <p className="text-lg text-slate-300 mb-2">Point Difference</p>
                <p className="text-2xl font-bold text-white">
                  {Math.abs((team1.total_rank_points || 0) - (team2.total_rank_points || 0))}
                </p>
              </div>
              <div className="bg-black/40 backdrop-blur rounded-lg p-4">
                <p className="text-lg text-slate-300 mb-2">Favored Team</p>
                <p className="text-xl font-bold text-yellow-400">
                  {(team1.total_rank_points || 0) > (team2.total_rank_points || 0) ? team1.name : team2.name}
                </p>
              </div>
            </div>
          </div>

          {/* Team 2 */}
          <Card className="bg-gradient-to-br from-red-900/40 to-red-800/40 backdrop-blur border-red-400/30 p-8 h-full">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-bold text-white mb-2">{team2.name}</h2>
              <Badge variant="outline" className="text-xl px-4 py-1 bg-red-600/30 border-red-400">
                Seed #{team2.seed || 'N/A'}
              </Badge>
            </div>

            {/* Team Stats */}
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg text-slate-300">Total Points</p>
                <p className="text-3xl font-bold text-white">{team2.total_rank_points}</p>
              </div>
              <div className="text-center">
                <p className="text-lg text-slate-300">Average Rank Points</p>
                <p className="text-2xl font-bold text-red-300">{calculateAverageRank(team2)}</p>
              </div>
              <div className="text-center">
                <p className="text-lg text-slate-300">Team Size</p>
                <p className="text-2xl font-bold text-white">{team2.team_members.length}</p>
              </div>
            </div>

            {/* Team Members */}
            <div className="mt-8">
              <h4 className="text-xl font-bold text-white mb-4 text-center">Roster</h4>
              <div className="space-y-3">
                {team2.team_members.map((member) => (
                  <div key={member.user_id} className="flex items-center space-x-3 p-2 rounded bg-black/20">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.users.discord_avatar_url || undefined} />
                      <AvatarFallback className="text-sm">
                        {member.users.discord_username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate text-sm">
                        {member.users.discord_username}
                      </p>
                      <p className="text-xs text-slate-300">{member.users.current_rank}</p>
                    </div>
                    {member.is_captain && (
                      <Badge variant="secondary" className="text-xs">C</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}