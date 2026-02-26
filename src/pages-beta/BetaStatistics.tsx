import { useEffect, useState } from "react";
import { Trophy, Users, Target, Medal, Star, Crown, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GradientBackground, GlassCard, StatCard, BetaBadge } from "@/components-beta/ui-beta";

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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy, Users, Target, Medal, Star, Crown, BarChart3,
};

const rarityConfig: Record<string, { label: string; color: string; bg: string }> = {
  common: { label: "Common", color: "text-[hsl(var(--beta-text-secondary))]", bg: "bg-[hsl(var(--beta-surface-4))]" },
  rare: { label: "Rare", color: "text-blue-400", bg: "bg-blue-500/15" },
  epic: { label: "Epic", color: "text-purple-400", bg: "bg-purple-500/15" },
  legendary: { label: "Legendary", color: "text-[hsl(var(--beta-accent))]", bg: "bg-[hsl(var(--beta-accent-subtle))]" },
};

type TabKey = "global" | "achievements" | "my-achievements";

const BetaStatistics = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Achievement[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("global");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all achievements
        const { data: achievementsData } = await supabase
          .from("achievements")
          .select("*")
          .eq("is_active", true)
          .order("points", { ascending: false });

        // Fetch user achievements if logged in
        let userAchievementsData: Achievement[] = [];
        if (user) {
          const { data } = await supabase
            .from("user_achievements")
            .select(`
              earned_at,
              achievements (
                id, name, description, icon, category, points, rarity
              )
            `)
            .eq("user_id", user.id);

          userAchievementsData = data?.map((ua: any) => ({
            ...ua.achievements,
            earned_at: ua.earned_at,
          })) || [];
        }

        // Fetch global statistics
        const [
          { count: totalTournaments },
          { count: totalMatches },
          { count: totalUsers },
          { data: topWinner },
          { data: topAchievementUser },
        ] = await Promise.all([
          supabase.from("tournaments").select("*", { count: "exact", head: true }),
          supabase.from("matches").select("*", { count: "exact", head: true }),
          supabase.from("public_user_profiles").select("*", { count: "exact", head: true }),
          supabase
            .from("public_user_profiles")
            .select("discord_username, tournaments_won")
            .order("tournaments_won", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.rpc("get_achievement_leaders"),
        ]);

        const leaders = (topAchievementUser?.[0] || {}) as any;

        setAchievements(achievementsData || []);
        setUserAchievements(userAchievementsData);
        setGlobalStats({
          total_tournaments: totalTournaments || 0,
          total_matches: totalMatches || 0,
          total_users: totalUsers || 0,
          average_participation: totalTournaments
            ? Math.round((totalUsers || 0) / (totalTournaments || 1))
            : 0,
          top_winner: {
            name: topWinner?.discord_username || "No data",
            wins: topWinner?.tournaments_won || 0,
          },
          top_achievement_user: {
            name: leaders?.top_points_username || "No data",
            points: leaders?.top_points_total || 0,
          },
          most_achievements_user: {
            name: leaders?.most_achievements_username || "No data",
            count: leaders?.most_achievements_count || 0,
          },
        });
      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const tabs: { key: TabKey; label: string; requiresAuth?: boolean }[] = [
    { key: "global", label: "Global Stats" },
    { key: "achievements", label: "All Achievements" },
    { key: "my-achievements", label: "My Achievements", requiresAuth: true },
  ];

  const AchievementCard = ({
    achievement,
    earned = false,
  }: {
    achievement: Achievement;
    earned?: boolean;
  }) => {
    const IconComponent = iconMap[achievement.icon] || Trophy;
    const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;

    return (
      <GlassCard
        variant={earned ? "default" : "subtle"}
        hover={earned}
        className={`
          relative overflow-hidden transition-all duration-200
          ${earned ? "beta-border-glow" : "opacity-50"}
        `}
      >
        {/* Rarity indicator line */}
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 ${rarity.bg}`}
          style={{ opacity: earned ? 1 : 0.3 }}
        />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`shrink-0 p-2.5 rounded-[var(--beta-radius-md)] ${rarity.bg}`}>
            <IconComponent
              className={`w-5 h-5 ${earned ? rarity.color : "text-[hsl(var(--beta-text-muted))]"}`}
            />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${rarity.color}`}>
            {rarity.label}
          </span>
        </div>

        <h4 className="text-sm font-semibold text-[hsl(var(--beta-text-primary))] mb-1">
          {achievement.name}
        </h4>
        <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-3 line-clamp-2">
          {achievement.description}
        </p>

        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-[hsl(var(--beta-accent-muted))]">
            {achievement.points} pts
          </span>
          {earned && achievement.earned_at && (
            <span className="text-[10px] text-[hsl(var(--beta-text-muted))]">
              {new Date(achievement.earned_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </GlassCard>
    );
  };

  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading statistics...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-7 h-7 text-[hsl(var(--beta-accent))]" />
            <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
              Statistics & Achievements
            </h1>
          </div>
          <p className="text-[hsl(var(--beta-text-secondary))]">
            Platform-wide statistics and achievement tracking
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-surface-2))] border border-[hsl(var(--beta-border))] w-fit mb-8">
          {tabs.map((tab) => {
            if (tab.requiresAuth && !user) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-[var(--beta-radius-md)] text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-[hsl(var(--beta-accent))] text-[hsl(220_20%_4%)]"
                    : "text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Global Stats Tab */}
        {activeTab === "global" && (
          <div className="space-y-6 beta-animate-fade-in">
            {/* Top stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label="Total Tournaments"
                value={globalStats?.total_tournaments ?? 0}
                icon={<Trophy />}
              />
              <StatCard
                label="Total Matches"
                value={globalStats?.total_matches ?? 0}
                icon={<Target />}
              />
              <StatCard
                label="Total Players"
                value={globalStats?.total_users ?? 0}
                icon={<Users />}
              />
            </div>

            {/* Highlight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <GlassCard variant="strong" className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-500" />
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-[var(--beta-radius-md)] bg-yellow-500/15">
                    <Crown className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--beta-text-muted))]">
                    Top Winner
                  </span>
                </div>
                <p className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">
                  {globalStats?.top_winner.name}
                </p>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  {globalStats?.top_winner.wins} tournament{globalStats?.top_winner.wins !== 1 ? "s" : ""} won
                </p>
              </GlassCard>

              <GlassCard variant="strong" className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))]" />
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-[var(--beta-radius-md)] bg-[hsl(var(--beta-accent-subtle))]">
                    <Star className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--beta-text-muted))]">
                    Achievement Leader
                  </span>
                </div>
                <p className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">
                  {globalStats?.top_achievement_user.name}
                </p>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  {globalStats?.top_achievement_user.points} points
                </p>
              </GlassCard>

              <GlassCard variant="strong" className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-[var(--beta-radius-md)] bg-purple-500/15">
                    <Medal className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--beta-text-muted))]">
                    Most Achievements
                  </span>
                </div>
                <p className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">
                  {globalStats?.most_achievements_user.name}
                </p>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  {globalStats?.most_achievements_user.count} achievements
                </p>
              </GlassCard>
            </div>
          </div>
        )}

        {/* All Achievements Tab */}
        {activeTab === "achievements" && (
          <div className="space-y-8 beta-animate-fade-in">
            {["tournament", "match", "participation", "general"].map((category) => {
              const categoryAchievements = achievements.filter(
                (a) => a.category === category
              );
              if (categoryAchievements.length === 0) return null;

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] capitalize">
                      {category} Achievements
                    </h3>
                    <BetaBadge variant="default">{categoryAchievements.length}</BetaBadge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categoryAchievements.map((achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        earned={userAchievements.some(
                          (ua) => ua.id === achievement.id
                        )}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {achievements.length === 0 && (
              <GlassCard className="p-12 text-center">
                <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
                  No Achievements Available
                </h3>
                <p className="text-[hsl(var(--beta-text-muted))]">
                  Achievements will be added soon.
                </p>
              </GlassCard>
            )}
          </div>
        )}

        {/* My Achievements Tab */}
        {activeTab === "my-achievements" && user && (
          <div className="space-y-6 beta-animate-fade-in">
            {/* Personal stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Achievements Earned"
                value={`${userAchievements.length} / ${achievements.length}`}
                icon={<Trophy />}
              />
              <StatCard
                label="Total Points"
                value={userAchievements.reduce((sum, a) => sum + a.points, 0)}
                icon={<Star />}
              />
              <StatCard
                label="Completion"
                value={`${achievements.length > 0 ? Math.round((userAchievements.length / achievements.length) * 100) : 0}%`}
                icon={<Target />}
              />
            </div>

            {userAchievements.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-4">
                  Your Achievements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {userAchievements
                    .sort(
                      (a, b) =>
                        new Date(b.earned_at!).getTime() -
                        new Date(a.earned_at!).getTime()
                    )
                    .map((achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        earned
                      />
                    ))}
                </div>
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
                  No Achievements Yet
                </h3>
                <p className="text-[hsl(var(--beta-text-muted))]">
                  Start participating in tournaments and winning matches to earn your first achievements!
                </p>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaStatistics;
