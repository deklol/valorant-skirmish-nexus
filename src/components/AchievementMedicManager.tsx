import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Trophy, 
  Plus, 
  Trash2, 
  Edit, 
  User, 
  Award, 
  Settings, 
  Search, 
  Filter,
  RefreshCw,
  Star,
  Crown,
  Target,
  Zap,
  Medal,
  Gem,
  Shield,
  Sword,
  Heart,
  CircleCheck,
  CircleX,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from 'date-fns';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  rarity: string;
  requirement_type: string;
  requirement_value: number;
  requirement_metadata: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievements: Achievement;
  users?: {
    discord_username: string;
  };
  discord_username?: string;
}

interface User {
  id: string;
  discord_username: string;
  current_rank: string;
}

const ACHIEVEMENT_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "tournament", label: "Tournament" },
  { value: "performance", label: "Performance" },
  { value: "social", label: "Social" },
  { value: "special", label: "Special" }
];

const ACHIEVEMENT_RARITIES = [
  { value: "Common", label: "Common", color: "bg-gray-500" },
  { value: "Uncommon", label: "Uncommon", color: "bg-green-500" },
  { value: "Rare", label: "Rare", color: "bg-blue-500" },
  { value: "Epic", label: "Epic", color: "bg-purple-500" },
  { value: "Legendary", label: "Legendary", color: "bg-yellow-500" }
];

const ACHIEVEMENT_ICONS = [
  { value: "trophy", label: "Trophy", icon: Trophy },
  { value: "star", label: "Star", icon: Star },
  { value: "crown", label: "Crown", icon: Crown },
  { value: "target", label: "Target", icon: Target },
  { value: "zap", label: "Zap", icon: Zap },
  { value: "medal", label: "Medal", icon: Medal },
  { value: "gem", label: "Gem", icon: Gem },
  { value: "shield", label: "Shield", icon: Shield },
  { value: "sword", label: "Sword", icon: Sword },
  { value: "heart", label: "Heart", icon: Heart },
  { value: "award", label: "Award", icon: Award }
];

const REQUIREMENT_TYPES = [
  { value: "tournament_wins", label: "Tournament Wins" },
  { value: "total_wins", label: "Total Wins" },
  { value: "tournaments_played", label: "Tournaments Played" },
  { value: "win_rate_75", label: "75% Win Rate" },
  { value: "win_rate_90", label: "90% Win Rate" },
  { value: "custom", label: "Custom" }
];

export default function AchievementMedicManager() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Edit/Create achievement state
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "trophy",
    category: "general",
    points: 10,
    rarity: "common",
    requirement_type: "tournament_wins",
    requirement_value: 1,
    requirement_metadata: {},
    is_active: true
  });

  // Award achievement state
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const { toast } = useToast();

  // Fetch data
  useEffect(() => {
    fetchAchievements();
    fetchUserAchievements();
    fetchUsers();
  }, [refreshKey]);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAchievements = async () => {
    try {
      // Fetch user achievements with achievements data
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from("user_achievements")
        .select(`
          *,
          achievements (*)
        `)
        .order("earned_at", { ascending: false })
        .limit(50);

      if (userAchievementsError) throw userAchievementsError;

      // Fetch users data separately
      const userIds = userAchievements?.map(ua => ua.user_id) || [];
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, discord_username")
        .in("id", userIds);

      if (usersError) throw usersError;

      // Combine the data
      const combinedData = userAchievements?.map(ua => {
        const user = usersData?.find(u => u.id === ua.user_id);
        return {
          ...ua,
          discord_username: user?.discord_username || "Unknown User"
        };
      }) || [];

      setUserAchievements(combinedData);
    } catch (error: any) {
      console.error("Error fetching user achievements:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, discord_username, current_rank")
        .order("discord_username");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateAchievement = async () => {
    try {
      const { error } = await supabase
        .from("achievements")
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Achievement created successfully"
      });

      setIsCreateDialogOpen(false);
      resetForm();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateAchievement = async () => {
    if (!editingAchievement) return;

    try {
      const { error } = await supabase
        .from("achievements")
        .update(formData)
        .eq("id", editingAchievement.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Achievement updated successfully"
      });

      setEditingAchievement(null);
      resetForm();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteAchievement = async (achievementId: string) => {
    try {
      const { error } = await supabase
        .from("achievements")
        .delete()
        .eq("id", achievementId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Achievement deleted successfully"
      });

      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAwardAchievement = async () => {
    if (!selectedAchievement || !selectedUser) return;

    try {
      // Check if user already has this achievement
      const { data: existing } = await supabase
        .from("user_achievements")
        .select("id")
        .eq("user_id", selectedUser)
        .eq("achievement_id", selectedAchievement.id)
        .single();

      if (existing) {
        toast({
          title: "Error",
          description: "User already has this achievement",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from("user_achievements")
        .insert([{
          user_id: selectedUser,
          achievement_id: selectedAchievement.id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Achievement awarded successfully"
      });

      setAwardDialogOpen(false);
      setSelectedUser("");
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRevokeAchievement = async (userAchievementId: string) => {
    try {
      const { error } = await supabase
        .from("user_achievements")
        .delete()
        .eq("id", userAchievementId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Achievement revoked successfully"
      });

      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      icon: "trophy",
      category: "general",
      points: 10,
      rarity: "common",
      requirement_type: "tournament_wins",
      requirement_value: 1,
      requirement_metadata: {},
      is_active: true
    });
  };

  const openEditDialog = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      category: achievement.category,
      points: achievement.points,
      rarity: achievement.rarity,
      requirement_type: achievement.requirement_type,
      requirement_value: achievement.requirement_value,
      requirement_metadata: achievement.requirement_metadata,
      is_active: achievement.is_active
    });
  };

  const getIconComponent = (iconName: string) => {
    const iconObj = ACHIEVEMENT_ICONS.find(i => i.value === iconName);
    return iconObj ? iconObj.icon : Trophy;
  };

  const getRarityColor = (rarity: string) => {
    const rarityObj = ACHIEVEMENT_RARITIES.find(r => r.value === rarity);
    return rarityObj ? rarityObj.color : "bg-gray-500";
  };

  // Filter achievements
  const filteredAchievements = achievements.filter(achievement => {
    const matchesSearch = achievement.name.toLowerCase().includes(search.toLowerCase()) ||
                         achievement.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || achievement.category === categoryFilter;
    const matchesRarity = rarityFilter === "all" || achievement.rarity === rarityFilter;
    
    return matchesSearch && matchesCategory && matchesRarity;
  });

  // Filter users for award dialog
  const filteredUsers = users.filter(user =>
    user.discord_username.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="w-full px-1 md:px-2 pt-8">
      {/* Header */}
      <Card className="bg-slate-800/95 border border-slate-700 rounded-xl mb-8 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 pt-6 pb-2 px-6">
          <Trophy className="w-7 h-7 text-yellow-400" />
          <CardTitle className="text-2xl font-semibold text-white">Achievement Medic</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2">
          <p className="text-slate-200 mb-2 leading-tight">
            Manage achievements, requirements, and player awards
          </p>
          <p className="text-slate-400 leading-snug text-[15px]">
            Create custom achievements, set requirements, award to players, and manage the achievement system.
          </p>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="bg-slate-800/95 border border-slate-700 rounded-xl mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search achievements..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {ACHIEVEMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rarityFilter} onValueChange={setRarityFilter}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rarities</SelectItem>
                  {ACHIEVEMENT_RARITIES.map(rarity => (
                    <SelectItem key={rarity.value} value={rarity.value}>{rarity.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setRefreshKey(prev => prev + 1)}
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Achievement
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New Achievement</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Create a new achievement for players to earn
                    </DialogDescription>
                  </DialogHeader>
                  <AchievementForm 
                    formData={formData} 
                    setFormData={setFormData} 
                    isEditing={false}
                  />
                  <DialogFooter>
                    <Button
                      onClick={() => setIsCreateDialogOpen(false)}
                      variant="outline"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateAchievement}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      Create Achievement
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filteredAchievements.map(achievement => {
          const IconComponent = getIconComponent(achievement.icon);
          return (
            <Card key={achievement.id} className="bg-slate-800/95 border border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getRarityColor(achievement.rarity)}`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{achievement.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {achievement.category}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={`${getRarityColor(achievement.rarity)} text-white text-xs`}>
                    {achievement.rarity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-slate-400 text-sm mb-3">{achievement.description}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-yellow-400 text-sm font-medium">{achievement.points} points</span>
                  <Badge variant={achievement.is_active ? "default" : "secondary"}>
                    {achievement.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openEditDialog(achievement)}
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedAchievement(achievement);
                      setAwardDialogOpen(true);
                    }}
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Award
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-800 border-slate-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Achievement</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          Are you sure you want to delete "{achievement.name}"? This will also remove it from all players who have earned it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAchievement(achievement.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Awards */}
      <Card className="bg-slate-800/95 border border-slate-700 rounded-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Recent Awards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {userAchievements.map(userAchievement => {
              const IconComponent = getIconComponent(userAchievement.achievements.icon);
              return (
                <div key={userAchievement.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getRarityColor(userAchievement.achievements.rarity)}`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{userAchievement.discord_username}</p>
                      <p className="text-slate-400 text-sm">earned "{userAchievement.achievements.name}"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">
                      {formatDistanceToNow(new Date(userAchievement.earned_at))} ago
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700">
                          <CircleX className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Revoke Achievement</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Are you sure you want to revoke this achievement from {userAchievement.discord_username}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevokeAchievement(userAchievement.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
            {userAchievements.length === 0 && (
              <p className="text-slate-400 text-center py-4">No recent awards</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Achievement Dialog */}
      <Dialog open={!!editingAchievement} onOpenChange={() => setEditingAchievement(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Achievement</DialogTitle>
            <DialogDescription className="text-slate-400">
              Modify the achievement details
            </DialogDescription>
          </DialogHeader>
          <AchievementForm 
            formData={formData} 
            setFormData={setFormData} 
            isEditing={true}
          />
          <DialogFooter>
            <Button
              onClick={() => setEditingAchievement(null)}
              variant="outline"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAchievement}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Update Achievement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award Achievement Dialog */}
      <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Award Achievement</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a player to award "{selectedAchievement?.name}" to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search players..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select a player" />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.discord_username} ({user.current_rank || "Unranked"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setAwardDialogOpen(false)}
              variant="outline"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAwardAchievement}
              disabled={!selectedUser}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Award Achievement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Achievement Form Component
function AchievementForm({ formData, setFormData, isEditing }: {
  formData: any;
  setFormData: (data: any) => void;
  isEditing: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="bg-slate-700 border-slate-600 text-white"
            placeholder="Achievement name"
          />
        </div>
        <div>
          <Label className="text-white">Points</Label>
          <Input
            type="number"
            value={formData.points}
            onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
            className="bg-slate-700 border-slate-600 text-white"
            min="1"
          />
        </div>
      </div>
      
      <div>
        <Label className="text-white">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="bg-slate-700 border-slate-600 text-white"
          placeholder="Achievement description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACHIEVEMENT_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white">Rarity</Label>
          <Select 
            value={formData.rarity} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, rarity: value }))}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACHIEVEMENT_RARITIES.map(rarity => (
                <SelectItem key={rarity.value} value={rarity.value}>{rarity.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Icon</Label>
          <Select 
            value={formData.icon} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACHIEVEMENT_ICONS.map(icon => {
                const IconComponent = icon.icon;
                return (
                  <SelectItem key={icon.value} value={icon.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-4 h-4" />
                      {icon.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-white">Requirement Type</Label>
          <Select 
            value={formData.requirement_type} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, requirement_type: value }))}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUIREMENT_TYPES.map(req => (
                <SelectItem key={req.value} value={req.value}>{req.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-white">Requirement Value</Label>
        <Input
          type="number"
          value={formData.requirement_value}
          onChange={(e) => setFormData(prev => ({ ...prev, requirement_value: parseInt(e.target.value) || 0 }))}
          className="bg-slate-700 border-slate-600 text-white"
          min="1"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
          className="w-4 h-4"
        />
        <Label htmlFor="is_active" className="text-white">Active</Label>
      </div>
    </div>
  );
}