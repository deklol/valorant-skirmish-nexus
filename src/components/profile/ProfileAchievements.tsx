import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Star,
  Crown,
  Target,
  Zap,
  Medal,
  Gem,
  Shield,
  Sword,
  Heart,
  Award,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  rarity: string;
  is_active: boolean;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  achievements: Achievement;
}

interface ProfileAchievementsProps {
  userId: string;
  isOwnProfile: boolean;
}

const ACHIEVEMENT_ICONS = {
  trophy: Trophy,
  star: Star,
  crown: Crown,
  target: Target,
  zap: Zap,
  medal: Medal,
  gem: Gem,
  shield: Shield,
  sword: Sword,
  heart: Heart,
  award: Award
};

const RARITY_COLORS = {
  common: "bg-gray-500",
  uncommon: "bg-green-500", 
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500"
};

export default function ProfileAchievements({ userId, isOwnProfile }: ProfileAchievementsProps) {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const achievementsPerPage = 6;

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch user's achievements
      const { data: userAchievements, error: userError } = await supabase
        .from("user_achievements")
        .select(`
          *,
          achievements (*)
        `)
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      if (userError) throw userError;

      // Fetch all achievements for progress display
      const { data: allAchievements, error: allError } = await supabase
        .from("achievements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (allError) throw allError;

      setUserAchievements(userAchievements || []);
      setAllAchievements(allAchievements || []);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    return ACHIEVEMENT_ICONS[iconName as keyof typeof ACHIEVEMENT_ICONS] || Trophy;
  };

  const getRarityColor = (rarity: string) => {
    return RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || "bg-gray-500";
  };

  const earnedAchievementIds = userAchievements.map(ua => ua.achievement_id);
  const displayAchievements = showAll ? allAchievements : allAchievements.filter(a => earnedAchievementIds.includes(a.id));
  
  const totalPages = Math.ceil(displayAchievements.length / achievementsPerPage);
  const startIndex = currentPage * achievementsPerPage;
  const endIndex = startIndex + achievementsPerPage;
  const currentAchievements = displayAchievements.slice(startIndex, endIndex);

  const earnedCount = userAchievements.length;
  const totalPoints = userAchievements.reduce((sum, ua) => sum + (ua.achievements?.points || 0), 0);

  if (loading) {
    return (
      <Card className="bg-slate-800/95 border-slate-700">
        <CardContent className="py-6">
          <div className="text-center text-slate-400">Loading achievements...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/95 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Achievements
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
              {totalPoints} points
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              {earnedCount}/{allAchievements.length}
            </Badge>
          </div>
        </div>
        {earnedCount > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              onClick={() => setShowAll(!showAll)}
              size="sm"
              variant="outline"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              {showAll ? "Show Earned Only" : "Show All Achievements"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {earnedCount === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {isOwnProfile ? "You haven't" : "This player hasn't"} earned any achievements yet.
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Play tournaments and improve your performance to unlock achievements!
            </p>
          </div>
        ) : (
          <>
            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {currentAchievements.map(achievement => {
                const isEarned = earnedAchievementIds.includes(achievement.id);
                const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
                const IconComponent = getIconComponent(achievement.icon);
                
                return (
                  <Card 
                    key={achievement.id} 
                    className={`transition-all duration-200 ${
                      isEarned 
                        ? 'border-primary bg-primary/5' 
                        : 'opacity-50 border-slate-600 bg-slate-700/30'
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${getRarityColor(achievement.rarity)}`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <Badge 
                          className={`${getRarityColor(achievement.rarity)} text-white text-xs`}
                        >
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-white font-medium text-sm">{achievement.name}</h3>
                        <p className="text-slate-400 text-xs mt-1">{achievement.description}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-yellow-400 text-xs font-medium">
                          {achievement.points} points
                        </span>
                        {isEarned && userAchievement && (
                          <span className="text-green-400 text-xs">
                            {formatDistanceToNow(new Date(userAchievement.earned_at))} ago
                          </span>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-xs mt-2"
                      >
                        {achievement.category}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  size="sm"
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                <span className="text-slate-400 text-sm">
                  Page {currentPage + 1} of {totalPages}
                </span>
                
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                  size="sm"
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}