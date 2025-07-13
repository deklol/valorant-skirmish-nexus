import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, TrendingUp, Calendar, Medal, Target, Star, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  rarity: string;
  earned_at?: string;
}

interface GlobalStats {
  total_tournaments: number;
  total_matches: number;
  total_users: number;
  average_participation: number;
  top_winner: { name: string; wins: number };
  top_achievement_user: { name: string; points: number };
  most_achievements_user: { name: string; count: number };
}

const iconMap: Record<string, any> = {
  Trophy, Users, TrendingUp, Calendar, Medal, Target, Star, Crown
};

const rarityColors = {
  common: "bg-slate-500",
  rare: "bg-blue-500", 
  epic: "bg-purple-500",
  legendary: "bg-yellow-500"
};

const Statistics = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Achievement[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all achievements
        const { data: achievementsData } = await supabase
          .from('achievements')
          .select('*')
          .eq('is_active', true)
          .order('points', { ascending: false });

        // Fetch user achievements if logged in
        let userAchievementsData = [];
        if (user) {
          const { data } = await supabase
            .from('user_achievements')
            .select(`
              earned_at,
              achievements (
                id, name, description, icon, category, points, rarity
              )
            `)
            .eq('user_id', user.id);
          
          userAchievementsData = data?.map(ua => ({
            ...ua.achievements,
            earned_at: ua.earned_at
          })) || [];
        }

        // Fetch global statistics
        const [
          { count: totalTournaments },
          { count: totalMatches },
          { count: totalUsers },
          { data: topWinner },
          { data: topAchievementUser },
          { data: mostAchievementsUser }
        ] = await Promise.all([
          supabase.from('tournaments').select('*', { count: 'exact', head: true }),
          supabase.from('matches').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase
            .from('users')
            .select('discord_username, tournaments_won')
            .order('tournaments_won', { ascending: false })
            .limit(1)
            .single(),
          supabase.rpc('get_achievement_leaders'),
          supabase.rpc('get_achievement_leaders')
        ]);

        const leaders = (topAchievementUser?.[0] || {}) as any;

        setAchievements(achievementsData || []);
        setUserAchievements(userAchievementsData);
        setGlobalStats({
          total_tournaments: totalTournaments || 0,
          total_matches: totalMatches || 0,
          total_users: totalUsers || 0,
          average_participation: totalTournaments ? Math.round((totalUsers || 0) / (totalTournaments || 1)) : 0,
          top_winner: {
            name: topWinner?.discord_username || "No data",
            wins: topWinner?.tournaments_won || 0
          },
          top_achievement_user: {
            name: leaders?.top_points_username || "No data",
            points: leaders?.top_points_total || 0
          },
          most_achievements_user: {
            name: leaders?.most_achievements_username || "No data",
            count: leaders?.most_achievements_count || 0
          }
        });
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const AchievementCard = ({ achievement, earned = false }: { achievement: Achievement; earned?: boolean }) => {
    const IconComponent = iconMap[achievement.icon] || Trophy;
    
    return (
      <Card className={`transition-all duration-200 ${earned ? 'border-primary bg-primary/5' : 'opacity-60'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <IconComponent className={`w-6 h-6 ${earned ? 'text-primary' : 'text-muted-foreground'}`} />
            <Badge 
              className={`${rarityColors[achievement.rarity as keyof typeof rarityColors]} text-white text-xs`}
            >
              {achievement.rarity}
            </Badge>
          </div>
          <CardTitle className="text-sm">{achievement.name}</CardTitle>
          <CardDescription className="text-xs">{achievement.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{achievement.points} points</span>
            {earned && achievement.earned_at && (
              <span className="text-xs text-primary">
                {new Date(achievement.earned_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-white">Loading statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Statistics & Achievements</h1>
          <p className="text-slate-400">Platform-wide statistics and achievement tracking</p>
        </div>

        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="global">Global Stats</TabsTrigger>
            <TabsTrigger value="achievements">All Achievements</TabsTrigger>
            {user && <TabsTrigger value="my-achievements">My Achievements</TabsTrigger>}
          </TabsList>

          <TabsContent value="global" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalStats?.total_tournaments}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalStats?.total_matches}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalStats?.total_users}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Winner</CardTitle>
                  <Crown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{globalStats?.top_winner.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {globalStats?.top_winner.wins} tournaments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Achievement Leader</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{globalStats?.top_achievement_user.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {globalStats?.top_achievement_user.points} points
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Most Achievements</CardTitle>
                  <Medal className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{globalStats?.most_achievements_user.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {globalStats?.most_achievements_user.count} achievements
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="space-y-4">
              {['tournament', 'match', 'participation', 'general'].map(category => {
                const categoryAchievements = achievements.filter(a => a.category === category);
                if (categoryAchievements.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-white mb-3 capitalize">{category} Achievements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryAchievements.map(achievement => (
                        <AchievementCard 
                          key={achievement.id} 
                          achievement={achievement}
                          earned={userAchievements.some(ua => ua.id === achievement.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {user && (
            <TabsContent value="my-achievements" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Achievements Earned</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userAchievements.length}</div>
                    <p className="text-xs text-muted-foreground">
                      of {achievements.length} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {userAchievements.reduce((sum, a) => sum + a.points, 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {achievements.length > 0 ? Math.round((userAchievements.length / achievements.length) * 100) : 0}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {userAchievements.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Your Achievements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {userAchievements
                      .sort((a, b) => new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime())
                      .map(achievement => (
                        <AchievementCard 
                          key={achievement.id} 
                          achievement={achievement}
                          earned={true}
                        />
                      ))}
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Achievements Yet</h3>
                    <p className="text-muted-foreground">
                      Start participating in tournaments and winning matches to earn your first achievements!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Statistics;