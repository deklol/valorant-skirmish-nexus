import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Target, TrendingUp, Users, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface AchievementLeader {
  top_points_user_id: string;
  top_points_username: string;
  top_points_total: number;
  most_achievements_user_id: string;
  most_achievements_username: string;
  most_achievements_count: number;
}

interface TopPlayer {
  id: string;
  discord_username: string;
  current_rank: string;
  rank_points: number;
  wins: number;
  tournaments_won: number;
}

const MemberHighlights = () => {
  const [achievementLeaders, setAchievementLeaders] = useState<AchievementLeader | null>(null);
  const [topPlayer, setTopPlayer] = useState<TopPlayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        // Get achievement leaders
        const { data: achievementData, error: achievementError } = await supabase
          .rpc('get_achievement_leaders');

        if (achievementError) {
          console.error('Error fetching achievement leaders:', achievementError);
        } else if (achievementData && achievementData.length > 0) {
          setAchievementLeaders(achievementData[0]);
        }

        // Get top player by rank points
        const { data: topPlayerData, error: topPlayerError } = await supabase
          .from('users')
          .select('id, discord_username, current_rank, rank_points, wins, tournaments_won')
          .not('current_rank', 'is', null)
          .order('rank_points', { ascending: false })
          .limit(1)
          .single();

        if (topPlayerError) {
          console.error('Error fetching top player:', topPlayerError);
        } else {
          setTopPlayer(topPlayerData);
        }
      } catch (error) {
        console.error('Error fetching member highlights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHighlights();
  }, []);

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Member Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-400 text-center py-4">Loading highlights...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Member Highlights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Ranked Player */}
        {topPlayer && (
          <div className="border border-slate-600 rounded-lg p-3 bg-gradient-to-r from-yellow-900/20 to-yellow-800/10">
            <div className="flex items-center gap-2 mb-2">
              <Medal className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-semibold text-sm">Top Ranked Player</span>
            </div>
            <Link to={`/profile/${topPlayer.id}`} className="hover:underline">
              <div className="text-white font-bold">{topPlayer.discord_username}</div>
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs border-yellow-600 text-yellow-300">
                {topPlayer.current_rank}
              </Badge>
              <span className="text-yellow-300 text-xs">{topPlayer.rank_points} RP</span>
            </div>
            <div className="text-slate-400 text-xs mt-1">
              {topPlayer.wins}W • {topPlayer.tournaments_won} Tournament Wins
            </div>
          </div>
        )}

        {/* Achievement Leaders */}
        {achievementLeaders && (
          <div className="space-y-3">
            {/* Most Achievement Points */}
            {achievementLeaders.top_points_user_id && (
              <div className="border border-slate-600 rounded-lg p-3 bg-gradient-to-r from-purple-900/20 to-purple-800/10">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 font-semibold text-sm">Most Achievement Points</span>
                </div>
                <Link to={`/profile/${achievementLeaders.top_points_user_id}`} className="hover:underline">
                  <div className="text-white font-bold">{achievementLeaders.top_points_username}</div>
                </Link>
                <div className="text-purple-300 text-sm">{achievementLeaders.top_points_total} points</div>
              </div>
            )}

            {/* Most Achievements */}
            {achievementLeaders.most_achievements_user_id && (
              <div className="border border-slate-600 rounded-lg p-3 bg-gradient-to-r from-green-900/20 to-green-800/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-semibold text-sm">Most Achievements</span>
                </div>
                <Link to={`/profile/${achievementLeaders.most_achievements_user_id}`} className="hover:underline">
                  <div className="text-white font-bold">{achievementLeaders.most_achievements_username}</div>
                </Link>
                <div className="text-green-300 text-sm">{achievementLeaders.most_achievements_count} achievements</div>
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="pt-2 border-t border-slate-600 space-y-2">
          <Link to="/leaderboard" className="block">
            <div className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm p-2 rounded hover:bg-slate-700">
              <TrendingUp className="w-4 h-4" />
              View Full Rankings
            </div>
          </Link>
          <Link to="/players" className="block">
            <div className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm p-2 rounded hover:bg-slate-700">
              <Users className="w-4 h-4" />
              Browse All Players
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberHighlights;