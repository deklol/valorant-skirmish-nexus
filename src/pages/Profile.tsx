import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Trophy, Target, Calendar, Settings, Bell, RefreshCw, TrendingUp, Twitter, Twitch, Clock, Award, Swords, Save, Shield, CheckSquare } from "lucide-react";
import { AgentSelector } from "@/components/AgentSelector";
import { RoleSelector } from "@/components/RoleSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import NotificationPreferences from "@/components/NotificationPreferences";
import RiotIdDialog from "@/components/RiotIdDialog";
import RankHistory from "@/components/RankHistory";
import ProfileMatchHistory from '@/components/profile/ProfileMatchHistory';
import ProfileTournamentHistory from '@/components/profile/ProfileTournamentHistory';
import ProfileRankHistory from '@/components/profile/ProfileRankHistory';
import ProfileValorantRankedMatches from '@/components/profile/ProfileValorantRankedMatches';
import ProfileAchievements from '@/components/profile/ProfileAchievements';
import { getTrackerGGUrl } from "@/utils/getTrackerGGUrl";
import { useUserTeam } from "@/hooks/useUserTeam";
import ClickableTeamName from "@/components/ClickableTeamName";
import { Username } from "@/components/Username";
import { Users } from "lucide-react";
import { ProfileHeaderSkeleton } from "@/components/ui/loading-skeleton";
import ErrorBoundary from "@/components/ErrorBoundary";

interface UserProfile {
  id: string;
  discord_username: string;
  riot_id: string;
  current_rank: string;
  peak_rank: string;
  wins: number;
  losses: number;
  tournaments_played: number;
  tournaments_won: number;
  bio: string;
  twitter_handle: string;
  twitch_handle: string;
  discord_avatar_url: string;
  profile_visibility: string;
  last_seen: string;
  created_at: string;
  role: string;
  valorant_agent?: string;
  valorant_role?: string;
  status_message?: string;
  looking_for_team?: boolean;
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshingRank, setRefreshingRank] = useState(false);
  const [showRiotDialog, setShowRiotDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    bio: '',
    twitter_handle: '',
    twitch_handle: '',
    profile_visibility: 'public',
    valorant_agent: '',
    valorant_role: '',
    status_message: '',
    looking_for_team: false
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { userTeam, loading: teamLoading } = useUserTeam(user?.id);

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
      setEditingProfile({
        bio: data.bio || '',
        twitter_handle: data.twitter_handle || '',
        twitch_handle: data.twitch_handle || '',
        profile_visibility: data.profile_visibility || 'public',
        valorant_agent: (data as any).valorant_agent || '',
        valorant_role: (data as any).valorant_role || '',
        status_message: (data as any).status_message || '',
        looking_for_team: (data as any).looking_for_team || false
      });
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

  const saveProfileChanges = async () => {
    if (!user) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          bio: editingProfile.bio,
          twitter_handle: editingProfile.twitter_handle,
          twitch_handle: editingProfile.twitch_handle,
          profile_visibility: editingProfile.profile_visibility,
          valorant_agent: editingProfile.valorant_agent,
          valorant_role: editingProfile.valorant_role as any,
          status_message: editingProfile.status_message,
          looking_for_team: editingProfile.looking_for_team
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { 
        ...prev, 
        bio: editingProfile.bio,
        twitter_handle: editingProfile.twitter_handle,
        twitch_handle: editingProfile.twitch_handle,
        profile_visibility: editingProfile.profile_visibility,
        valorant_agent: editingProfile.valorant_agent,
        valorant_role: editingProfile.valorant_role,
        status_message: editingProfile.status_message,
        looking_for_team: editingProfile.looking_for_team
      } : null);
      
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

  const handleRiotIdComplete = async () => {
    await fetchProfile();
  };

  // Helper function to get agent icon URL by looking it up in our map
  const getAgentIconUrl = (agentName: string) => {
    return valorantAgentIcons[agentName] || '';
  };

  // Helper function to get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Duelist': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'Controller': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'Initiator': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'Sentinel': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ProfileHeaderSkeleton />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Please log in</h2>
            <p className="text-slate-400">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="Profile">
      <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <Card className="bg-slate-800 border-slate-700 mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {profile.discord_avatar_url ? (
                <img 
                  src={profile.discord_avatar_url} 
                  alt={profile.discord_username || 'User'} 
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <CardTitle className="text-white text-2xl flex items-center gap-2">
                  <Username username={profile.discord_username || 'Unknown Player'} userId={profile.id} size="lg" weight="bold" />
                  {profile.role === 'admin' && (
                    <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                 </CardTitle>
                 
                 {/* Status Message */}
                 {(profile as any).status_message && (
                   <p className="text-slate-300 text-sm mt-1 italic">"{(profile as any).status_message}"</p>
                 )}
                 
                 <div className="flex items-center gap-2 mt-2">
                   {profile.current_rank && (
                     <Badge className="bg-blue-600 text-white">
                       {profile.current_rank}
                     </Badge>
                   )}
                   {profile.peak_rank && profile.peak_rank !== profile.current_rank && (
                     <Badge variant="outline" className="border-yellow-600 text-yellow-400">
                       Peak: {profile.peak_rank}
                     </Badge>
                   )}
                   
                   {/* Valorant Role */}
                   {(profile as any).valorant_role && (
                     <Badge variant="outline" className={`border ${getRoleColor((profile as any).valorant_role)}`}>
                       {(profile as any).valorant_role}
                     </Badge>
                   )}
                   
                   {(profile as any).looking_for_team && (
                     <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white border-green-500">
                       <CheckSquare className="w-3 h-3 mr-1" />
                       LFT
                     </Badge>
                   )}
                 </div>
                 
                 {/* Agent Selection */}
                 {(profile as any).valorant_agent && (
                   <div className="flex items-center gap-2 mt-2">
                     <img 
                       src={getAgentIconUrl((profile as any).valorant_agent)} 
                       alt={(profile as any).valorant_agent}
                       className="w-6 h-6 rounded"
                       onError={(e) => {
                         e.currentTarget.style.display = 'none';
                       }}
                     />
                     <span className="text-slate-400 text-sm">{(profile as any).valorant_agent}</span>
                   </div>
                 )}
              </div>
             </div>
             
              <div className="flex flex-col items-end gap-2">
                {/* Profile Links List: Twitter, Twitch, Tracker.gg */}
                {(profile.twitter_handle || profile.twitch_handle || profile.riot_id) && (
                  <div className="flex flex-col items-end gap-0.5 text-sm">
                    <span className="text-slate-400 font-semibold mb-1">Links</span>
                    {profile.twitter_handle && (
                      <a
                        href={`https://twitter.com/${profile.twitter_handle.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-blue-400"
                      >
                        Twitter
                      </a>
                    )}
                    {profile.twitch_handle && (
                      <a
                        href={`https://twitch.tv/${profile.twitch_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-purple-400"
                      >
                        Twitch
                      </a>
                    )}
                    {profile.riot_id && (
                      <a
                        href={getTrackerGGUrl(profile.riot_id) || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-red-400"
                      >
                        Tracker.gg
                      </a>
                     )}
                   </div>
                 )}
               </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">About</h3>
              <p className="text-slate-300">{profile.bio}</p>
            </div>
          )}
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Swords className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-400">{profile.wins}</div>
              <div className="text-sm text-slate-400">Match Wins</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-400">{profile.losses}</div>
              <div className="text-sm text-slate-400">Match Losses</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400">{profile.tournaments_played}</div>
              <div className="text-sm text-slate-400">Tournaments Played</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400">{profile.tournaments_won}</div>
              <div className="text-sm text-slate-400">Tournament Wins</div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
            </div>
            {profile.last_seen && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Last seen {formatDistanceToNow(new Date(profile.last_seen), { addSuffix: true })}
              </div>
            )}
            {profile.riot_id && (
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                {profile.riot_id}
              </div>
            )}
          </div>

          {/* Team Information */}
          {userTeam && (
            <div className="mt-6 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Current Team
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <ClickableTeamName 
                    teamId={userTeam.id} 
                    teamName={userTeam.name}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  />
                  {userTeam.description && (
                    <p className="text-slate-400 text-sm mt-1">{userTeam.description}</p>
                  )}
                  <p className="text-slate-500 text-xs mt-1">
                    {userTeam.member_count}/{userTeam.max_members} members
                    {userTeam.is_user_captain && " • You are the captain"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="text-slate-400">Team Record</div>
                  <div className="text-white font-medium">
                    {userTeam.wins || 0}W - {userTeam.losses || 0}L
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-7 bg-slate-800/90 border border-slate-700 overflow-x-auto gap-1 md:gap-0">
              <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white whitespace-nowrap px-2 md:px-4">
                <Settings className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Settings</span>
                <span className="md:hidden">Set</span>
              </TabsTrigger>
              <TabsTrigger value="awards" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white whitespace-nowrap px-2 md:px-4">
                <span className="hidden md:inline">Achievements</span>
                <span className="md:hidden">Awards</span>
              </TabsTrigger>
              <TabsTrigger value="matches" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white whitespace-nowrap px-2 md:px-4">
                <span className="hidden md:inline">Match History</span>
                <span className="md:hidden">Matches</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white whitespace-nowrap px-2 md:px-4">
                <span className="hidden md:inline">Tournaments</span>
                <span className="md:hidden">Tourns</span>
              </TabsTrigger>
              <TabsTrigger value="rank-history" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white whitespace-nowrap px-2 md:px-4">
                <TrendingUp className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Rank History</span>
                <span className="md:hidden">Rank</span>
              </TabsTrigger>
              <TabsTrigger value="ranked-matches" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white whitespace-nowrap px-2 md:px-4">
                <span className="hidden md:inline">Ranked Matches</span>
                <span className="md:hidden">Ranked</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white whitespace-nowrap px-2 md:px-4">
                <Bell className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Notifications</span>
                <span className="md:hidden">Notif</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-6 space-y-6">
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discord" className="text-slate-300">Discord Username</Label>
                      <Input
                        id="discord"
                        value={profile.discord_username || ''}
                        onChange={(e) => updateProfile('discord_username', e.target.value)}
                        className="bg-slate-600 border-slate-500 text-white"
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
                          className="bg-slate-600 border-slate-500 text-white"
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

              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-300">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editingProfile.bio}
                      onChange={(e) => setEditingProfile(prev => ({ ...prev, bio: e.target.value }))}
                      className="bg-slate-600 border-slate-500 text-white"
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="text-slate-300">Twitter Handle</Label>
                      <Input
                        id="twitter"
                        value={editingProfile.twitter_handle}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, twitter_handle: e.target.value }))}
                        className="bg-slate-600 border-slate-500 text-white"
                        placeholder="@username"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="twitch" className="text-slate-300">Twitch Handle</Label>
                      <Input
                        id="twitch"
                        value={editingProfile.twitch_handle}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, twitch_handle: e.target.value }))}
                        className="bg-slate-600 border-slate-500 text-white"
                        placeholder="username"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visibility" className="text-slate-300">Profile Visibility</Label>
                    <Select 
                      value={editingProfile.profile_visibility} 
                      onValueChange={(value) => setEditingProfile(prev => ({ ...prev, profile_visibility: value }))}
                    >
                      <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-600 border-slate-500">
                        <SelectItem value="public" className="text-white">Public - Anyone can view</SelectItem>
                        <SelectItem value="private" className="text-white">Private - Only you can view</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={saveProfileChanges} 
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Gaming Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-slate-300">Status Message</Label>
                    <Input
                      id="status"
                      value={editingProfile.status_message}
                      onChange={(e) => setEditingProfile(prev => ({ ...prev, status_message: e.target.value }))}
                      className="bg-slate-600 border-slate-500 text-white"
                      placeholder="What's on your mind?"
                      maxLength={100}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="valorant-role" className="text-slate-300">Valorant Role</Label>
                      <RoleSelector
                        value={editingProfile.valorant_role}
                        onValueChange={(value) => setEditingProfile(prev => ({ ...prev, valorant_role: value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="valorant-agent" className="text-slate-300">Main Agent</Label>
                      <AgentSelector
                        value={editingProfile.valorant_agent}
                        onValueChange={(value) => setEditingProfile(prev => ({ ...prev, valorant_agent: value }))}
                      />
                    </div>
                  </div>

                   <div className="flex items-center space-x-2">
                     <Checkbox
                       id="lft"
                       checked={editingProfile.looking_for_team}
                       onCheckedChange={(checked) => setEditingProfile(prev => ({ 
                         ...prev, 
                         looking_for_team: checked === true 
                       }))}
                     />
                     <Label htmlFor="lft" className="text-slate-300 cursor-pointer">
                       Looking for Team (LFT)
                     </Label>
                   </div>

                   <Button 
                     onClick={saveProfileChanges} 
                     disabled={updating}
                     className="bg-green-600 hover:bg-green-700"
                   >
                     <Save className="w-4 h-4 mr-2" />
                     {updating ? 'Saving...' : 'Save Gaming Profile'}
                   </Button>
                 </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="awards" className="mt-6">
              <ProfileAchievements userId={user.id} isOwnProfile={true} />
            </TabsContent>
            
            <TabsContent value="matches" className="mt-6">
              <ProfileMatchHistory userId={user.id} />
            </TabsContent>
            
            <TabsContent value="tournaments" className="mt-6">
              <ProfileTournamentHistory userId={user.id} />
            </TabsContent>

            <TabsContent value="rank-history" className="mt-6">
              <ProfileRankHistory userId={user.id} />
            </TabsContent>

            <TabsContent value="ranked-matches" className="mt-6">
              <ProfileValorantRankedMatches userId={user.id} />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <NotificationPreferences />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <RiotIdDialog
        open={showRiotDialog}
        onOpenChange={setShowRiotDialog}
        onComplete={handleRiotIdComplete}
      />
      </div>
    </ErrorBoundary>
  );
};

export default Profile;
