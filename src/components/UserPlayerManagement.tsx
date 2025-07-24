import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Users, Edit, Ban, Shield, ShieldOff, Search, ExternalLink, RefreshCw, Settings, User, Merge, UserX, Archive, FileText, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ClickableUsername from "./ClickableUsername";
import ManualRankOverrideSection from "./admin/ManualRankOverrideSection";

interface UserData {
  id: string;
  discord_username: string | null;
  riot_id: string | null;
  current_rank: string | null;
  peak_rank: string | null;
  weight_rating: number;
  role: 'admin' | 'player' | 'viewer';
  is_banned: boolean;
  ban_reason: string | null;
  ban_expires_at: string | null;
  wins: number;
  losses: number;
  tournaments_played: number;
  tournaments_won: number;
  created_at: string;
  bio: string | null;
  twitter_handle: string | null;
  twitch_handle: string | null;
  profile_visibility: string | null;
  manual_rank_override: string | null;
  manual_weight_override: number | null;
  use_manual_override: boolean;
  rank_override_reason: string | null;
  rank_override_set_by: string | null;
  rank_points: number | null;
  last_seen: string | null;
}

const UserPlayerManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [refreshingRank, setRefreshingRank] = useState<string | null>(null);
  
  // Player Medic states
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetUserId, setMergeTargetUserId] = useState("");
  const [rankOverrideDialogOpen, setRankOverrideDialogOpen] = useState(false);
  const [rankOverride, setRankOverride] = useState("");
  const [weightOverride, setWeightOverride] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [useOverride, setUseOverride] = useState(false);
  
  const [banForm, setBanForm] = useState({
    reason: '',
    expires_at: '',
    duration: 'permanent'
  });
  const [editForm, setEditForm] = useState({
    role: 'player' as 'admin' | 'player' | 'viewer',
    bio: '',
    twitter_handle: '',
    twitch_handle: '',
    profile_visibility: 'public',
    peak_rank: '' as string
  });
  const [manualOverrideForm, setManualOverrideForm] = useState({
    manual_rank_override: null as string | null,
    manual_weight_override: null as number | null,
    use_manual_override: false,
    rank_override_reason: null as string | null
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users, filterRole, filterStatus]);

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.discord_username?.toLowerCase().includes(query) ||
        user.riot_id?.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      );
    }

    if (filterRole !== "all") {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    if (filterStatus !== "all") {
      if (filterStatus === "banned") {
        filtered = filtered.filter(user => user.is_banned);
      } else if (filterStatus === "active") {
        filtered = filtered.filter(user => !user.is_banned);
      } else if (filterStatus === "override") {
        filtered = filtered.filter(user => user.use_manual_override);
      }
    }

    setFilteredUsers(filtered);
  };

  const fetchUsers = async () => {
    console.log("🔄 UserPlayerManagement: Fetching users data");
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          rank_override_set_by_user:rank_override_set_by(discord_username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log(`✅ UserPlayerManagement: Loaded ${data?.length || 0} users`);
      setUsers(data || []);
    } catch (error) {
      console.error('❌ UserPlayerManagement: Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshRank = async (user: UserData) => {
    if (!user.riot_id) {
      toast({
        title: "Error",
        description: "User doesn't have a Riot ID set",
        variant: "destructive",
      });
      return;
    }

    console.log(`🔄 UserPlayerManagement: Refreshing rank for ${user.discord_username}`);
    setRefreshingRank(user.id);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-rank', {
        body: {
          riot_id: user.riot_id,
          user_id: user.id
        }
      });

      if (error) throw error;

      console.log(`✅ UserPlayerManagement: Rank refreshed for ${user.discord_username}:`, data);
      toast({
        title: "Rank Updated",
        description: data.current_rank 
          ? `Rank updated to ${data.current_rank} (${data.weight_rating} weight)${data.peak_rank_updated ? ', Peak rank also updated' : ''}`
          : "Rank data refreshed",
      });

      fetchUsers();
    } catch (error: any) {
      console.error('❌ UserPlayerManagement: Error refreshing rank:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh rank",
        variant: "destructive",
      });
    } finally {
      setRefreshingRank(null);
    }
  };

  const handleEditUser = (user: UserData) => {
    console.log(`🔧 UserPlayerManagement: Opening edit dialog for ${user.discord_username}`);
    setEditingUser(user);
    setEditForm({
      role: user.role,
      bio: user.bio || '',
      twitter_handle: user.twitter_handle || '',
      twitch_handle: user.twitch_handle || '',
      profile_visibility: user.profile_visibility || 'public',
      peak_rank: user.peak_rank || ''
    });
    setManualOverrideForm({
      manual_rank_override: user.manual_rank_override,
      manual_weight_override: user.manual_weight_override,
      use_manual_override: user.use_manual_override || false,
      rank_override_reason: user.rank_override_reason
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    console.log(`🔄 UserPlayerManagement: Updating user ${editingUser.discord_username}`, editForm, manualOverrideForm);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: editForm.role,
          bio: editForm.bio || null,
          twitter_handle: editForm.twitter_handle || null,
          twitch_handle: editForm.twitch_handle || null,
          profile_visibility: editForm.profile_visibility,
          peak_rank: editForm.peak_rank || null,
          manual_rank_override: manualOverrideForm.manual_rank_override,
          manual_weight_override: manualOverrideForm.manual_weight_override,
          use_manual_override: manualOverrideForm.use_manual_override,
          rank_override_reason: manualOverrideForm.rank_override_reason,
          rank_override_set_by: manualOverrideForm.use_manual_override ? (await supabase.auth.getUser()).data.user?.id : null,
          rank_override_set_at: manualOverrideForm.use_manual_override ? new Date().toISOString() : null
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      console.log(`✅ UserPlayerManagement: Successfully updated ${editingUser.discord_username}`);
      toast({
        title: "User Updated",
        description: `${editingUser.discord_username || 'User'} has been updated successfully`,
      });

      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('❌ UserPlayerManagement: Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleBanUser = (user: UserData) => {
    console.log(`🚫 UserPlayerManagement: Opening ban dialog for ${user.discord_username}`);
    setEditingUser(user);
    setBanForm({ reason: '', expires_at: '', duration: 'permanent' });
    setBanDialogOpen(true);
  };

  const handleExecuteBan = async () => {
    if (!editingUser) return;

    console.log(`🔄 UserPlayerManagement: Banning user ${editingUser.discord_username}`, banForm);
    try {
      let expiresAt = null;
      if (banForm.duration !== 'permanent') {
        const days = parseInt(banForm.duration);
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: true,
          ban_reason: banForm.reason,
          ban_expires_at: expiresAt
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      console.log(`✅ UserPlayerManagement: Successfully banned ${editingUser.discord_username}`);
      toast({
        title: "User Banned",
        description: `${editingUser.discord_username || 'User'} has been banned`,
      });

      setBanDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('❌ UserPlayerManagement: Error banning user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to ban user",
        variant: "destructive",
      });
    }
  };

  const handleUnbanUser = async (user: UserData) => {
    console.log(`🔄 UserPlayerManagement: Unbanning user ${user.discord_username}`);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: false,
          ban_reason: null,
          ban_expires_at: null
        })
        .eq('id', user.id);

      if (error) throw error;

      console.log(`✅ UserPlayerManagement: Successfully unbanned ${user.discord_username}`);
      toast({
        title: "User Unbanned",
        description: `${user.discord_username || 'User'} has been unbanned`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error('❌ UserPlayerManagement: Error unbanning user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unban user",
        variant: "destructive",
      });
    }
  };

  const handleRankOverride = (user: UserData) => {
    console.log(`🎯 UserPlayerManagement: Opening rank override dialog for ${user.discord_username}`);
    setEditingUser(user);
    setRankOverride(user.current_rank || "");
    setWeightOverride(user.weight_rating?.toString() || "");
    setOverrideReason(user.rank_override_reason || "");
    setUseOverride(user.use_manual_override || false);
    setRankOverrideDialogOpen(true);
  };

  const handleExecuteRankOverride = async () => {
    if (!editingUser || !rankOverride || !overrideReason.trim()) return;

    console.log(`🔄 UserPlayerManagement: Applying rank override for ${editingUser.discord_username}`, {
      rank: rankOverride,
      weight: weightOverride,
      enabled: useOverride,
      reason: overrideReason
    });

    try {
      const { error } = await supabase
        .from('users')
        .update({
          manual_rank_override: rankOverride,
          manual_weight_override: weightOverride ? parseInt(weightOverride) : null,
          use_manual_override: useOverride,
          rank_override_reason: overrideReason.trim(),
          rank_override_set_at: new Date().toISOString(),
          rank_override_set_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      console.log(`✅ UserPlayerManagement: Successfully ${useOverride ? 'applied' : 'reset'} rank override for ${editingUser.discord_username}`);
      toast({
        title: "Rank Override Applied",
        description: `${editingUser.discord_username}'s rank has been ${useOverride ? 'overridden' : 'reset'}`
      });

      setRankOverrideDialogOpen(false);
      setEditingUser(null);
      setRankOverride("");
      setWeightOverride("");
      setOverrideReason("");
      setUseOverride(false);
      fetchUsers();
    } catch (error: any) {
      console.error(`❌ UserPlayerManagement: Failed to apply rank override:`, error);
      toast({
        title: "Failed to apply rank override",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleMergeAccounts = (user: UserData) => {
    console.log(`🔀 UserPlayerManagement: Opening account merge dialog for ${user.discord_username}`);
    setEditingUser(user);
    setMergeTargetUserId("");
    setMergeDialogOpen(true);
  };

  const handleExecuteMerge = async () => {
    if (!editingUser || !mergeTargetUserId) return;

    console.log(`🔄 UserPlayerManagement: Starting account merge for user ${editingUser.id} -> ${mergeTargetUserId}`);
    
    try {
      // Verify target user exists
      const { data: targetUser, error: targetError } = await supabase
        .from('users')
        .select('id, discord_username, wins, losses, tournaments_played, tournaments_won')
        .eq('id', mergeTargetUserId)
        .single();

      if (targetError || !targetUser) {
        throw new Error('Target user not found');
      }

      console.log(`📝 UserPlayerManagement: Target user found: ${targetUser.discord_username}`);

      // Update all related records to point to target user
      const { error: teamMembersError } = await supabase
        .from('team_members')
        .update({ user_id: mergeTargetUserId })
        .eq('user_id', editingUser.id);

      if (teamMembersError) throw new Error(`Failed to update team memberships: ${teamMembersError.message}`);

      const { error: signupsError } = await supabase
        .from('tournament_signups')
        .update({ user_id: mergeTargetUserId })
        .eq('user_id', editingUser.id);

      if (signupsError) throw new Error(`Failed to update tournament signups: ${signupsError.message}`);

      const { error: achievementsError } = await supabase
        .from('user_achievements')
        .update({ user_id: mergeTargetUserId })
        .eq('user_id', editingUser.id);

      if (achievementsError) throw new Error(`Failed to update achievements: ${achievementsError.message}`);

      // Merge statistics
      const { error: statsError } = await supabase
        .from('users')
        .update({
          wins: (targetUser.wins || 0) + (editingUser.wins || 0),
          losses: (targetUser.losses || 0) + (editingUser.losses || 0),
          tournaments_played: (targetUser.tournaments_played || 0) + (editingUser.tournaments_played || 0),
          tournaments_won: (targetUser.tournaments_won || 0) + (editingUser.tournaments_won || 0)
        })
        .eq('id', mergeTargetUserId);

      if (statsError) throw new Error(`Failed to merge statistics: ${statsError.message}`);

      // Delete the source user
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', editingUser.id);

      if (deleteError) throw new Error(`Failed to delete source user: ${deleteError.message}`);

      console.log(`✅ UserPlayerManagement: Successfully merged ${editingUser.discord_username} into ${targetUser.discord_username}`);
      
      toast({
        title: "Account Merge Successful",
        description: `${editingUser.discord_username} has been merged into ${targetUser.discord_username}`
      });

      setMergeDialogOpen(false);
      setEditingUser(null);
      setMergeTargetUserId("");
      fetchUsers();
    } catch (error: any) {
      console.error(`❌ UserPlayerManagement: Account merge failed:`, error);
      toast({
        title: "Failed to merge accounts",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getRankDisplays = () => [
    "Iron 1", "Iron 2", "Iron 3",
    "Bronze 1", "Bronze 2", "Bronze 3",
    "Silver 1", "Silver 2", "Silver 3",
    "Gold 1", "Gold 2", "Gold 3",
    "Platinum 1", "Platinum 2", "Platinum 3",
    "Diamond 1", "Diamond 2", "Diamond 3",
    "Ascendant 1", "Ascendant 2", "Ascendant 3",
    "Immortal 1", "Immortal 2", "Immortal 3",
    "Radiant"
  ];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const getUserStatusBadge = (user: UserData) => {
    if (user.is_banned) {
      return <Badge className="bg-red-500/20 text-red-400">Banned</Badge>;
    }
    if (user.use_manual_override) {
      return <Badge className="bg-yellow-500/20 text-yellow-400">Override</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-400">Active</Badge>;
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-8 text-center">
          <p className="text-white">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            User & Player Management
            <span className="text-xs text-green-300 bg-green-900 px-2 py-1 rounded">Enhanced</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="flex-1 min-w-64 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by username, Riot ID, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="override">Override</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={fetchUsers}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-600"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-300">User Info</TableHead>
                  <TableHead className="text-slate-300">Rank & Stats</TableHead>
                  <TableHead className="text-slate-300">Role & Status</TableHead>
                  <TableHead className="text-slate-300">Record</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-white">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ClickableUsername 
                            userId={user.id}
                            username={user.discord_username || 'No username'}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/profile/${user.id}`, '_blank')}
                            className="p-1 h-6 w-6"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="text-xs text-slate-400">
                          Riot ID: {user.riot_id || 'Not set'}
                        </div>
                        <div className="text-xs text-slate-400">
                          Last seen: {formatDate(user.last_seen)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="space-y-1">
                        <div>{user.current_rank || 'Unranked'}</div>
                        <div className="text-xs text-slate-400">
                          Weight: {user.weight_rating || 150}
                        </div>
                        <div className="text-xs text-slate-400">
                          Points: {user.rank_points || 0}
                        </div>
                        {user.use_manual_override && (
                          <Badge className="bg-amber-600 text-white text-xs">
                            <Settings className="w-3 h-3 mr-1" />
                            Override
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge 
                          variant={user.role === 'admin' ? 'destructive' : 'secondary'}
                          className={user.role === 'admin' ? 'bg-red-600' : 'bg-slate-600'}
                        >
                          {user.role}
                        </Badge>
                        {getUserStatusBadge(user)}
                      </div>
                    </TableCell>
                    <TableCell className="text-white text-sm">
                      <div className="space-y-1">
                        <div>W: {user.wins} L: {user.losses}</div>
                        <div>Tournaments: {user.tournaments_played}</div>
                        <div>Won: {user.tournaments_won}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          onClick={() => handleEditUser(user)}
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-white"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        {user.riot_id && (
                          <Button
                            onClick={() => handleRefreshRank(user)}
                            size="sm"
                            variant="outline"
                            disabled={refreshingRank === user.id}
                            className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                          >
                            <RefreshCw className={`w-3 h-3 ${refreshingRank === user.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                        <Button
                          onClick={() => handleRankOverride(user)}
                          size="sm"
                          variant="outline"
                          className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => handleMergeAccounts(user)}
                          size="sm"
                          variant="outline"
                          className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
                        >
                          <Merge className="w-3 h-3" />
                        </Button>
                        {user.is_banned ? (
                          <Button
                            onClick={() => handleUnbanUser(user)}
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                          >
                            <ShieldOff className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleBanUser(user)}
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Display count */}
          <div className="mt-4 text-sm text-slate-400">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User Profile</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update user information, roles, and peak rank. Changes will be saved to the database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-slate-600 pb-2">Basic Information</h3>
              
              <div className="space-y-2">
                <Label className="text-white">Discord Username</Label>
                <Input
                  value={editingUser?.discord_username || ''}
                  disabled
                  className="bg-slate-600 border-slate-500 text-slate-400"
                  placeholder="Cannot be edited - managed by Discord OAuth"
                />
                <p className="text-xs text-slate-400">Discord username is managed automatically and cannot be changed manually.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value as 'admin' | 'player' | 'viewer' }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Bio</Label>
                <Textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="User bio..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Twitter Handle</Label>
                  <Input
                    value={editForm.twitter_handle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, twitter_handle: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Twitch Handle</Label>
                  <Input
                    value={editForm.twitch_handle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, twitch_handle: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Profile Visibility</Label>
                <Select value={editForm.profile_visibility} onValueChange={(value) => setEditForm(prev => ({ ...prev, profile_visibility: value }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Peak Rank</Label>
                <Select value={editForm.peak_rank || "none"} onValueChange={(value) => setEditForm(prev => ({ ...prev, peak_rank: value === "none" ? "" : value }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select peak rank" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="none">No Peak Rank</SelectItem>
                    {getRankDisplays().map((rank) => (
                      <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">Manually set the user's peak rank achieved.</p>
              </div>
            </div>

            {/* Manual Rank Override Section */}
            <ManualRankOverrideSection
              userData={{
                manual_rank_override: manualOverrideForm.manual_rank_override,
                manual_weight_override: manualOverrideForm.manual_weight_override,
                use_manual_override: manualOverrideForm.use_manual_override,
                rank_override_reason: manualOverrideForm.rank_override_reason,
                current_rank: editingUser?.current_rank,
                peak_rank: editingUser?.peak_rank,
                weight_rating: editingUser?.weight_rating
              }}
              onOverrideChange={(overrideData) => setManualOverrideForm(overrideData)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-600">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-slate-600 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateUser}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Update User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Ban User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Ban Reason</Label>
              <Textarea
                value={banForm.reason}
                onChange={(e) => setBanForm(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Reason for banning this user..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Ban Duration</Label>
              <Select value={banForm.duration} onValueChange={(value) => setBanForm(prev => ({ ...prev, duration: value }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">1 Week</SelectItem>
                  <SelectItem value="30">1 Month</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setBanDialogOpen(false)}
                className="border-slate-600 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteBan}
                disabled={!banForm.reason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Ban User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rank Override Dialog */}
      <Dialog open={rankOverrideDialogOpen} onOpenChange={setRankOverrideDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Manual Rank Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Rank Override</Label>
              <Select value={rankOverride} onValueChange={setRankOverride}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select rank" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {getRankDisplays().map((rank) => (
                    <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Weight Override (Optional)</Label>
              <Input
                type="number"
                value={weightOverride}
                onChange={(e) => setWeightOverride(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="150"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Reason for Override</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Explain why this override is necessary..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useOverride"
                checked={useOverride}
                onChange={(e) => setUseOverride(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="useOverride" className="text-white">
                Enable Manual Override
              </Label>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setRankOverrideDialogOpen(false)}
                className="border-slate-600 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteRankOverride}
                disabled={!rankOverride || !overrideReason.trim()}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Apply Override
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Merge Dialog */}
      <AlertDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Merge User Accounts</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              This will merge all data from <strong>{editingUser?.discord_username}</strong> into another user account.
              <br /><br />
              <strong className="text-red-400">WARNING:</strong> This action is irreversible and will permanently delete the source account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Target User ID</Label>
              <Input
                value={mergeTargetUserId}
                onChange={(e) => setMergeTargetUserId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Enter the target user ID to merge into..."
              />
              <p className="text-xs text-slate-400">
                All stats, achievements, and team memberships will be transferred to this user.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteMerge}
              disabled={!mergeTargetUserId.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Merge Accounts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserPlayerManagement;