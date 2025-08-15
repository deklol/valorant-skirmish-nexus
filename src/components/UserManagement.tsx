import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Edit, Ban, Shield, ShieldOff, Search, ExternalLink, RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ClickableUsername from "./ClickableUsername";
import ManualRankOverrideSection from "./admin/ManualRankOverrideSection";
import BatchRankRefreshButton from "./BatchRankRefreshButton";

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
  spendable_points: number | null;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [refreshingRank, setRefreshingRank] = useState<string | null>(null);
  const [banForm, setBanForm] = useState({
    reason: '',
    expires_at: ''
  });
  const [editForm, setEditForm] = useState({
    role: 'player' as 'admin' | 'player' | 'viewer',
    bio: '',
    twitter_handle: '',
    twitch_handle: '',
    profile_visibility: 'public',
    riot_id: '',
    spendable_points: 0,
    peak_rank: null as string | null
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
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.discord_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.riot_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          rank_override_set_by_user:rank_override_set_by(discord_username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
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

    setRefreshingRank(user.id);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-rank', {
        body: {
          riot_id: user.riot_id,
          user_id: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Rank Updated",
        description: data.current_rank 
          ? `Rank updated to ${data.current_rank} (${data.weight_rating} weight)${data.peak_rank_updated ? ', Peak rank also updated' : ''}`
          : "Rank data refreshed",
      });

      // Refresh the users list to show updated data
      fetchUsers();
    } catch (error: any) {
      console.error('Error refreshing rank:', error);
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
    setEditingUser(user);
    setEditForm({
      role: user.role,
      bio: user.bio || '',
      twitter_handle: user.twitter_handle || '',
      twitch_handle: user.twitch_handle || '',
      profile_visibility: user.profile_visibility || 'public',
      riot_id: user.riot_id || '',
      spendable_points: user.spendable_points || 0,
      peak_rank: user.peak_rank
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

    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: editForm.role,
          bio: editForm.bio || null,
          twitter_handle: editForm.twitter_handle || null,
          twitch_handle: editForm.twitch_handle || null,
          profile_visibility: editForm.profile_visibility,
          riot_id: editForm.riot_id || null,
          spendable_points: editForm.spendable_points,
          peak_rank: editForm.peak_rank,
          // Manual rank override fields
          manual_rank_override: manualOverrideForm.manual_rank_override,
          manual_weight_override: manualOverrideForm.manual_weight_override,
          use_manual_override: manualOverrideForm.use_manual_override,
          rank_override_reason: manualOverrideForm.rank_override_reason,
          rank_override_set_by: manualOverrideForm.use_manual_override ? (await supabase.auth.getUser()).data.user?.id : null,
          rank_override_set_at: manualOverrideForm.use_manual_override ? new Date().toISOString() : null
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "User Updated",
        description: `${editingUser.discord_username || 'User'} has been updated successfully`,
      });

      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleBanUser = (user: UserData) => {
    setEditingUser(user);
    setBanForm({ reason: '', expires_at: '' });
    setBanDialogOpen(true);
  };

  const handleExecuteBan = async () => {
    if (!editingUser) return;

    try {
      const expiresAt = banForm.expires_at ? new Date(banForm.expires_at).toISOString() : null;
      
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: true,
          ban_reason: banForm.reason,
          ban_expires_at: expiresAt
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Log the audit action
      await supabase
        .from('audit_logs')
        .insert({
          action: 'user_banned',
          table_name: 'users',
          record_id: editingUser.id,
          new_values: {
            is_banned: true,
            ban_reason: banForm.reason,
            ban_expires_at: expiresAt
          }
        });

      toast({
        title: "User Banned",
        description: `${editingUser.discord_username || 'User'} has been banned`,
      });

      setBanDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to ban user",
        variant: "destructive",
      });
    }
  };

  const handleUnbanUser = async (user: UserData) => {
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

      // Log the audit action
      await supabase
        .from('audit_logs')
        .insert({
          action: 'user_unbanned',
          table_name: 'users',
          record_id: user.id,
          old_values: {
            is_banned: user.is_banned,
            ban_reason: user.ban_reason,
            ban_expires_at: user.ban_expires_at
          },
          new_values: {
            is_banned: false,
            ban_reason: null,
            ban_expires_at: null
          }
        });

      toast({
        title: "User Unbanned",
        description: `${user.discord_username || 'User'} has been unbanned`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unban user",
        variant: "destructive",
      });
    }
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
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            User Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <BatchRankRefreshButton 
              onRefreshComplete={fetchUsers}
              variant="outline" 
              size="sm"
              className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
            />
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-300">Discord Username</TableHead>
                <TableHead className="text-slate-300">Riot ID</TableHead>
                <TableHead className="text-slate-300">Rank / Weight</TableHead>
                <TableHead className="text-slate-300">Role</TableHead>
                <TableHead className="text-slate-300">Stats</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-white font-medium">
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
                  </TableCell>
                  <TableCell className="text-white">
                    {user.riot_id || 'No Riot ID'}
                  </TableCell>
                  <TableCell className="text-white">
                    <div className="flex flex-col gap-1">
                      <span>{user.current_rank || 'Unranked'}</span>
                      <span className="text-xs text-slate-400">Weight: {user.weight_rating || 150}</span>
                      {user.use_manual_override && (
                        <Badge className="bg-amber-600 text-white text-xs w-fit">
                          <Settings className="w-3 h-3 mr-1" />
                          Override
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.role === 'admin' ? 'destructive' : 'secondary'}
                      className={user.role === 'admin' ? 'bg-red-600' : 'bg-slate-600'}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white text-sm">
                    <div>W: {user.wins} L: {user.losses}</div>
                    <div>T: {user.tournaments_played} Won: {user.tournaments_won}</div>
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive" className="bg-red-600">
                        Banned
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-600">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleEditUser(user)}
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {user.riot_id && (
                        <Button
                          onClick={() => handleRefreshRank(user)}
                          size="sm"
                          variant="outline"
                          disabled={refreshingRank === user.id}
                          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshingRank === user.id ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      {user.is_banned ? (
                        <Button
                          onClick={() => handleUnbanUser(user)}
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                        >
                          <ShieldOff className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleBanUser(user)}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Dialog with Enhanced Manual Override Section */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic User Info Section */}
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
                  <Label className="text-white">Current Rank & Weight</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${editingUser?.current_rank || 'Unranked'} (Weight: ${editingUser?.weight_rating || 150})`}
                      disabled
                      className="bg-slate-600 border-slate-500 text-slate-400 flex-1"
                    />
                    {editingUser?.riot_id && (
                      <Button
                        onClick={() => editingUser && handleRefreshRank(editingUser)}
                        size="sm"
                        disabled={refreshingRank === editingUser?.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${refreshingRank === editingUser?.id ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    <p>Peak Rank: {editingUser?.peak_rank || 'None'}</p>
                    <p>Rank and weight are updated through the rank scraping system.</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-white">Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value: 'admin' | 'player' | 'viewer') => 
                      setEditForm(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="player" className="text-white hover:bg-slate-600">Player</SelectItem>
                      <SelectItem value="admin" className="text-white hover:bg-slate-600">Admin</SelectItem>
                      <SelectItem value="viewer" className="text-white hover:bg-slate-600">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riot_id" className="text-white">Riot ID</Label>
                  <Input
                    id="riot_id"
                    value={editForm.riot_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, riot_id: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="PlayerName#TAG"
                  />
                  <p className="text-xs text-slate-400">Format: PlayerName#TAG (e.g., JohnDoe#1234)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spendable_points" className="text-white">Achievement Points</Label>
                  <Input
                    id="spendable_points"
                    type="number"
                    min="0"
                    value={editForm.spendable_points}
                    onChange={(e) => setEditForm(prev => ({ ...prev, spendable_points: parseInt(e.target.value) || 0 }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-400">Points the user can spend in the shop</p>
                </div>
              </div>

              {/* Manual Rank Override Section */}
              <ManualRankOverrideSection
                userData={{
                  manual_rank_override: editingUser?.manual_rank_override,
                  manual_weight_override: editingUser?.manual_weight_override,
                  use_manual_override: editingUser?.use_manual_override,
                  rank_override_reason: editingUser?.rank_override_reason,
                  rank_override_set_by: editingUser?.rank_override_set_by,
                  current_rank: editingUser?.current_rank,
                  peak_rank: editingUser?.peak_rank,
                  weight_rating: editingUser?.weight_rating
                }}
                onOverrideChange={(overrideData) => setManualOverrideForm(overrideData)}
                onPeakRankChange={(peakRank) => setEditForm(prev => ({ ...prev, peak_rank: peakRank }))}
              />

              {/* Profile Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-600 pb-2">Profile Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-white">Bio</Label>
                  <Textarea
                    id="bio"
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="User biography..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitter_handle" className="text-white">Twitter Handle</Label>
                    <Input
                      id="twitter_handle"
                      value={editForm.twitter_handle}
                      onChange={(e) => setEditForm(prev => ({ ...prev, twitter_handle: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="username (without @)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitch_handle" className="text-white">Twitch Handle</Label>
                    <Input
                      id="twitch_handle"
                      value={editForm.twitch_handle}
                      onChange={(e) => setEditForm(prev => ({ ...prev, twitch_handle: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile_visibility" className="text-white">Profile Visibility</Label>
                  <Select
                    value={editForm.profile_visibility}
                    onValueChange={(value) => 
                      setEditForm(prev => ({ ...prev, profile_visibility: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="public" className="text-white hover:bg-slate-600">Public</SelectItem>
                      <SelectItem value="private" className="text-white hover:bg-slate-600">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateUser}
                  className="bg-blue-600 hover:bg-blue-700"
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
                <Label htmlFor="ban_reason" className="text-white">Ban Reason</Label>
                <Input
                  id="ban_reason"
                  value={banForm.reason}
                  onChange={(e) => setBanForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Reason for ban..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ban_expires" className="text-white">Ban Expires (Optional)</Label>
                <Input
                  id="ban_expires"
                  type="datetime-local"
                  value={banForm.expires_at}
                  onChange={(e) => setBanForm(prev => ({ ...prev, expires_at: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setBanDialogOpen(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExecuteBan}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Ban User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
