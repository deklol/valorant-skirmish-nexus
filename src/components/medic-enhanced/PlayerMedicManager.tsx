import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { User, Shield, Merge, Ban, Settings, Search, RefreshCw, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  discord_username: string | null;
  riot_id: string | null;
  current_rank: string | null;
  rank_points: number | null;
  wins: number | null;
  losses: number | null;
  tournaments_played: number | null;
  tournaments_won: number | null;
  role: string | null;
  is_banned: boolean | null;
  ban_reason: string | null;
  ban_expires_at: string | null;
  manual_rank_override: string | null;
  manual_weight_override: number | null;
  use_manual_override: boolean | null;
  created_at: string;
  last_seen: string | null;
}

export default function PlayerMedicManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rankOverride, setRankOverride] = useState("");
  const [weightOverride, setWeightOverride] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [useOverride, setUseOverride] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<string>("permanent");
  const [mergeTargetUserId, setMergeTargetUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showRankDialog, setShowRankDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filterRole, filterStatus]);

  const fetchUsers = async () => {
    console.log("🔄 PlayerMedic: Fetching users data");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      console.log(`✅ PlayerMedic: Loaded ${data?.length || 0} users`);
      setUsers(data || []);
    } catch (error: any) {
      console.error("❌ PlayerMedic: Failed to fetch users:", error);
      toast({
        title: "Failed to fetch users",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
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

  const handleRankOverride = async () => {
    if (!selectedUser || !rankOverride || !overrideReason.trim()) return;

    console.log(`🔄 PlayerMedic: Applying rank override for ${selectedUser.discord_username}`, {
      rank: rankOverride,
      weight: weightOverride,
      enabled: useOverride,
      reason: overrideReason
    });

    setLoading(true);
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
        .eq('id', selectedUser.id);

      if (error) throw error;

      console.log(`✅ PlayerMedic: Successfully ${useOverride ? 'applied' : 'reset'} rank override for ${selectedUser.discord_username}`);

      toast({
        title: "Rank Override Applied",
        description: `${selectedUser.discord_username}'s rank has been ${useOverride ? 'overridden' : 'reset'}`
      });

      setShowRankDialog(false);
      setSelectedUser(null);
      setRankOverride("");
      setWeightOverride("");
      setOverrideReason("");
      setUseOverride(false);
      fetchUsers();
    } catch (error: any) {
      console.error(`❌ PlayerMedic: Failed to apply rank override:`, error);
      toast({
        title: "Failed to apply rank override",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) return;

    console.log(`🔄 PlayerMedic: Banning user ${selectedUser.discord_username}`, {
      reason: banReason,
      duration: banDuration
    });

    setLoading(true);
    try {
      const banExpiresAt = banDuration === "permanent" ? null : 
        new Date(Date.now() + parseInt(banDuration) * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('users')
        .update({
          is_banned: true,
          ban_reason: banReason.trim(),
          ban_expires_at: banExpiresAt
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      console.log(`✅ PlayerMedic: Successfully banned ${selectedUser.discord_username} (${banDuration})`);

      toast({
        title: "User Banned",
        description: `${selectedUser.discord_username} has been banned`
      });

      setShowBanDialog(false);
      setSelectedUser(null);
      setBanReason("");
      setBanDuration("permanent");
      fetchUsers();
    } catch (error: any) {
      console.error(`❌ PlayerMedic: Failed to ban user:`, error);
      toast({
        title: "Failed to ban user",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = async (user: User) => {
    console.log(`🔄 PlayerMedic: Unbanning user ${user.discord_username}`);
    setLoading(true);
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

      console.log(`✅ PlayerMedic: Successfully unbanned ${user.discord_username}`);

      toast({
        title: "User Unbanned",
        description: `${user.discord_username} has been unbanned`
      });

      fetchUsers();
    } catch (error: any) {
      console.error(`❌ PlayerMedic: Failed to unban user:`, error);
      toast({
        title: "Failed to unban user",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountMerge = async () => {
    if (!selectedUser || !mergeTargetUserId) return;

    console.log(`🔄 PlayerMedic: Starting account merge for user ${selectedUser.id} -> ${mergeTargetUserId}`);
    setLoading(true);
    
    try {
      // Verify target user exists and get their full data
      const { data: targetUser, error: targetError } = await supabase
        .from('users')
        .select('id, discord_username, wins, losses, tournaments_played, tournaments_won')
        .eq('id', mergeTargetUserId)
        .single();

      if (targetError || !targetUser) {
        throw new Error('Target user not found');
      }

      console.log(`📝 PlayerMedic: Target user found: ${targetUser.discord_username}`);

      // Start transaction-like operations
      // 1. Update all team_members records
      const { error: teamMembersError } = await supabase
        .from('team_members')
        .update({ user_id: mergeTargetUserId })
        .eq('user_id', selectedUser.id);

      if (teamMembersError) {
        console.error(`❌ PlayerMedic: Failed to update team_members:`, teamMembersError);
        throw new Error(`Failed to update team memberships: ${teamMembersError.message}`);
      }

      // 2. Update tournament_signups records
      const { error: signupsError } = await supabase
        .from('tournament_signups')
        .update({ user_id: mergeTargetUserId })
        .eq('user_id', selectedUser.id);

      if (signupsError) {
        console.error(`❌ PlayerMedic: Failed to update tournament_signups:`, signupsError);
        throw new Error(`Failed to update tournament signups: ${signupsError.message}`);
      }

      // 3. Update user_achievements records
      const { error: achievementsError } = await supabase
        .from('user_achievements')
        .update({ user_id: mergeTargetUserId })
        .eq('user_id', selectedUser.id);

      if (achievementsError) {
        console.error(`❌ PlayerMedic: Failed to update user_achievements:`, achievementsError);
        throw new Error(`Failed to update achievements: ${achievementsError.message}`);
      }

      // 4. Merge statistics (add to target user)
      const { error: statsError } = await supabase
        .from('users')
        .update({
          wins: (targetUser.wins || 0) + (selectedUser.wins || 0),
          losses: (targetUser.losses || 0) + (selectedUser.losses || 0),
          tournaments_played: (targetUser.tournaments_played || 0) + (selectedUser.tournaments_played || 0),
          tournaments_won: (targetUser.tournaments_won || 0) + (selectedUser.tournaments_won || 0)
        })
        .eq('id', mergeTargetUserId);

      if (statsError) {
        console.error(`❌ PlayerMedic: Failed to merge statistics:`, statsError);
        throw new Error(`Failed to merge statistics: ${statsError.message}`);
      }

      // 5. Delete the source user
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);

      if (deleteError) {
        console.error(`❌ PlayerMedic: Failed to delete source user:`, deleteError);
        throw new Error(`Failed to delete source user: ${deleteError.message}`);
      }

      console.log(`✅ PlayerMedic: Successfully merged ${selectedUser.discord_username} into ${targetUser.discord_username}`);
      
      toast({
        title: "Account Merge Successful",
        description: `${selectedUser.discord_username} has been merged into ${targetUser.discord_username}`
      });

      setShowMergeDialog(false);
      setSelectedUser(null);
      setMergeTargetUserId("");
      fetchUsers();
    } catch (error: any) {
      console.error(`❌ PlayerMedic: Account merge failed:`, error);
      toast({
        title: "Failed to merge accounts",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const getUserStatusBadge = (user: User) => {
    if (user.is_banned) {
      return <Badge className="bg-red-500/20 text-red-400">Banned</Badge>;
    }
    if (user.use_manual_override) {
      return <Badge className="bg-yellow-500/20 text-yellow-400">Override</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-400">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Player Medic Manager
            <span className="text-xs text-cyan-300">(Phase 3)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search by username, Riot ID, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
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
              <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
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
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* User List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-slate-900 rounded border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">
                      {user.discord_username || 'Unknown User'}
                    </span>
                    {getUserStatusBadge(user)}
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-slate-400 space-y-1">
                    <div>Riot ID: {user.riot_id || 'Not set'}</div>
                    <div>Rank: {user.current_rank || 'Unranked'} ({user.rank_points || 0} pts)</div>
                    <div>Record: {user.wins || 0}W / {user.losses || 0}L</div>
                    <div>Tournaments: {user.tournaments_played || 0} played, {user.tournaments_won || 0} won</div>
                    <div>Last seen: {formatDate(user.last_seen)}</div>
                  </div>
                  
                  {user.is_banned && (
                    <div className="mt-2 p-2 bg-red-950/30 border border-red-600/30 rounded">
                      <div className="text-red-400 text-sm">
                        <strong>Banned:</strong> {user.ban_reason}
                      </div>
                      {user.ban_expires_at && (
                        <div className="text-red-400 text-xs">
                          Expires: {formatDate(user.ban_expires_at)}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {user.use_manual_override && (
                    <div className="mt-2 p-2 bg-yellow-950/30 border border-yellow-600/30 rounded">
                      <div className="text-yellow-400 text-sm">
                        <strong>Override:</strong> {user.manual_rank_override}
                        {user.manual_weight_override && ` (${user.manual_weight_override} weight)`}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedUser(user);
                      setRankOverride(user.manual_rank_override || user.current_rank || "");
                      setWeightOverride(user.manual_weight_override?.toString() || "");
                      setUseOverride(user.use_manual_override || false);
                      setShowRankDialog(true);
                    }}
                    size="sm"
                    variant="outline"
                    className="border-blue-600 text-blue-400"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  
                  {user.is_banned ? (
                    <Button
                      onClick={() => handleUnbanUser(user)}
                      size="sm"
                      variant="outline"
                      className="border-green-600 text-green-400"
                      disabled={loading}
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowBanDialog(true);
                      }}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400"
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowMergeDialog(true);
                    }}
                    size="sm"
                    variant="outline"
                    className="border-purple-600 text-purple-400"
                  >
                    <Merge className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-8 text-slate-400">
              No users found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rank Override Dialog */}
      <AlertDialog open={showRankDialog} onOpenChange={setShowRankDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Rank Override - {selectedUser?.discord_username}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Manually override the user's rank and weight rating for tournament balancing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-300">Override Rank</Label>
              <Select value={rankOverride} onValueChange={setRankOverride}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select rank..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {getRankDisplays().map(rank => (
                    <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-slate-300">Override Weight (Optional)</Label>
              <Input
                type="number"
                value={weightOverride}
                onChange={(e) => setWeightOverride(e.target.value)}
                placeholder="150"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <Label className="text-slate-300">Reason for Override</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why this override is necessary..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRankOverride}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!rankOverride || !overrideReason.trim()}
            >
              Apply Override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban User Dialog */}
      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Ban User - {selectedUser?.discord_username}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will prevent the user from participating in tournaments and accessing the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-300">Ban Reason</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Explain the reason for this ban..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <Label className="text-slate-300">Ban Duration</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
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
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBanUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={!banReason.trim()}
            >
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Merge Dialog */}
      <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Account Merge - {selectedUser?.discord_username}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Merge this account with another user account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-300">Target User ID</Label>
              <Input
                value={mergeTargetUserId}
                onChange={(e) => setMergeTargetUserId(e.target.value)}
                placeholder="Enter the user ID to merge with..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAccountMerge}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!mergeTargetUserId.trim()}
            >
              Merge Accounts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}