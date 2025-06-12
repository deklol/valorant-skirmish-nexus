import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Trophy, Target, Calendar, Settings, Bell, RefreshCw, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import NotificationPreferences from "@/components/NotificationPreferences";
import RiotIdDialog from "@/components/RiotIdDialog";
import RankHistory from "@/components/RankHistory";

interface UserProfile {
  discord_username: string;
  riot_id: string;
  current_rank: string;
  wins: number;
  losses: number;
  tournaments_played: number;
  tournaments_won: number;
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshingRank, setRefreshingRank] = useState(false);
  const [showRiotDialog, setShowRiotDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (field: string, value: string) => {
    if (!user) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ [field]: value })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, [field]: value } : null);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const refreshRankData = async () => {
    if (!user || !profile?.riot_id) {
      toast({
        title: "No Riot ID",
        description: "Please set your Riot ID first",
        variant: "destructive",
      });
      return;
    }

    setRefreshingRank(true);
    try {
      const { error } = await supabase.functions.invoke('scrape-rank', {
        body: { riot_id: profile.riot_id, user_id: user.id }
      });

      if (error) throw error;

      // Refresh profile data after rank update
      await fetchProfile();
      
      toast({
        title: "Success",
        description: "Rank data refreshed successfully",
      });
    } catch (error: any) {
      console.error('Error refreshing rank:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh rank data",
        variant: "destructive",
      });
    } finally {
      setRefreshingRank(false);
    }
  };

  const calculateWinRate = () => {
    if (!profile || (profile.wins + profile.losses) === 0) return 0;
    return Math.round((profile.wins / (profile.wins + profile.losses)) * 100);
  };

  const handleRiotIdComplete = async () => {
    await fetchProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Please log in to view your profile</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {profile.discord_username || 'Unknown Player'}
              </h1>
              <p className="text-slate-400">
                {profile.riot_id || 'No Riot ID set'}
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{profile.tournaments_won}</div>
                <div className="text-sm text-slate-300">Tournaments Won</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{profile.tournaments_played}</div>
                <div className="text-sm text-slate-300">Tournaments Played</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{calculateWinRate()}%</div>
                <div className="text-sm text-slate-300">Win Rate</div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-white mb-2">
                  {profile.wins} - {profile.losses}
                </div>
                <div className="text-sm text-slate-300">W - L Record</div>
                <Badge variant="outline" className="mt-1 border-slate-600 text-slate-300">
                  {profile.current_rank || 'Unranked'}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Profile Tabs */}
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="settings" className="text-white data-[state=active]:bg-red-600">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="rank-history" className="text-white data-[state=active]:bg-red-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Rank History
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-white data-[state=active]:bg-red-600">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discord" className="text-slate-300">Discord Username</Label>
                    <Input
                      id="discord"
                      value={profile.discord_username || ''}
                      onChange={(e) => updateProfile('discord_username', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter Discord username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="riot" className="text-slate-300">Riot ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="riot"
                        value={profile.riot_id || ''}
                        readOnly
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="No Riot ID set"
                      />
                      <Button
                        onClick={() => setShowRiotDialog(true)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => fetchProfile()} 
                    disabled={updating}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {updating ? 'Updating...' : 'Refresh Profile'}
                  </Button>
                  
                  {profile.riot_id && (
                    <Button 
                      onClick={refreshRankData} 
                      disabled={refreshingRank}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${refreshingRank ? 'animate-spin' : ''}`} />
                      {refreshingRank ? 'Refreshing...' : 'Refresh Rank'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rank-history" className="space-y-4">
            <RankHistory />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationPreferences />
          </TabsContent>
        </Tabs>
      </div>

      <RiotIdDialog
        open={showRiotDialog}
        onOpenChange={setShowRiotDialog}
        onComplete={handleRiotIdComplete}
      />
    </div>
  );
};

export default Profile;
