import { useState, useEffect } from 'react';
import { GlassCard } from "@/components-beta/ui-beta/GlassCard";
import { BetaButton } from "@/components-beta/ui-beta/BetaButton";
import { BetaBadge } from "@/components-beta/ui-beta/BetaBadge";
import { BetaCard } from "@/components-beta/ui-beta/BetaCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Edit, Ban, Shield, ShieldOff, Search, ExternalLink, RefreshCw, Settings, Trash2, AlertTriangle 
} from "lucide-react";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
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

  const handleDeleteUser = (user: UserData) => {
    setEditingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!editingUser) return;

    setDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: editingUser.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "User Deleted",
        description: data.message || `${editingUser.discord_username || 'User'} has been permanently deleted`,
      });

      setDeleteDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(false);
    }
  };

  if (loading) {
    return (
      <GlassCard variant="strong">
        <div className="p-8 text-center">
          <p className="text-[hsl(var(--beta-text-primary))]">Loading users...</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="strong" noPadding>
      {/* Header */}
      <div className="p-5 border-b border-[hsl(var(--beta-glass-border))]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-[hsl(var(--beta-text-primary))] text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            User Management
            <BetaBadge variant="default">{users.length} users</BetaBadge>
          </h2>
          <div className="flex items-center gap-2">
            <BatchRankRefreshButton 
              onRefreshComplete={fetchUsers}
              variant="outline" 
              size="sm"
              className="border-[hsl(var(--beta-accent)/0.5)] text-[hsl(var(--beta-accent))] hover:bg-[hsl(var(--beta-accent)/0.1)]"
            />
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--beta-text-muted))]" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto p-5">
        <Table>
          <TableHeader>
            <TableRow className="border-[hsl(var(--beta-glass-border))]">
              <TableHead className="text-[hsl(var(--beta-text-secondary))]">Discord Username</TableHead>
              <TableHead className="text-[hsl(var(--beta-text-secondary))]">Riot ID</TableHead>
              <TableHead className="text-[hsl(var(--beta-text-secondary))]">Rank / Weight</TableHead>
              <TableHead className="text-[hsl(var(--beta-text-secondary))]">Role</TableHead>
              <TableHead className="text-[hsl(var(--beta-text-secondary))]">Stats</TableHead>
              <TableHead className="text-[hsl(var(--beta-text-secondary))]">Status</TableHead>
              <TableHead className="text-[hsl(var(--beta-text-secondary))]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="border-[hsl(var(--beta-glass-border))] hover:bg-[hsl(var(--beta-surface-3))]">
                <TableCell className="text-[hsl(var(--beta-text-primary))] font-medium">
                  <div className="flex items-center gap-2">
                    <ClickableUsername 
                      userId={user.id}
                      username={user.discord_username || 'No username'}
                    />
                    <button
                      onClick={() => window.open(`/profile/${user.id}`, '_blank')}
                      className="p-1 h-6 w-6 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-accent))] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-[hsl(var(--beta-text-primary))]">
                  {user.riot_id || <span className="text-[hsl(var(--beta-text-muted))]">No Riot ID</span>}
                </TableCell>
                <TableCell className="text-[hsl(var(--beta-text-primary))]">
                  <div className="flex flex-col gap-1">
                    <span>{user.current_rank || 'Unranked'}</span>
                    <span className="text-xs text-[hsl(var(--beta-text-muted))]">Weight: {user.weight_rating || 150}</span>
                    {user.use_manual_override && (
                      <BetaBadge variant="warning" size="sm">
                        <Settings className="w-3 h-3 mr-1" />
                        Override
                      </BetaBadge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <BetaBadge variant={user.role === 'admin' ? 'error' : 'default'}>
                    {user.role}
                  </BetaBadge>
                </TableCell>
                <TableCell className="text-[hsl(var(--beta-text-secondary))] text-sm">
                  <div>W: {user.wins} L: {user.losses}</div>
                  <div>T: {user.tournaments_played} Won: {user.tournaments_won}</div>
                </TableCell>
                <TableCell>
                  {user.is_banned ? (
                    <BetaBadge variant="error">Banned</BetaBadge>
                  ) : (
                    <BetaBadge variant="success">Active</BetaBadge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <BetaButton
                      onClick={() => handleEditUser(user)}
                      size="sm"
                      variant="secondary"
                    >
                      <Edit className="w-4 h-4" />
                    </BetaButton>
                    {user.riot_id && (
                      <BetaButton
                        onClick={() => handleRefreshRank(user)}
                        size="sm"
                        variant="outline"
                        disabled={refreshingRank === user.id}
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshingRank === user.id ? 'animate-spin' : ''}`} />
                      </BetaButton>
                    )}
                    {user.is_banned ? (
                      <BetaButton
                        onClick={() => handleUnbanUser(user)}
                        size="sm"
                        variant="outline"
                        className="border-[hsl(var(--beta-success)/0.5)] text-[hsl(var(--beta-success))] hover:bg-[hsl(var(--beta-success)/0.1)]"
                      >
                        <ShieldOff className="w-4 h-4" />
                      </BetaButton>
                    ) : (
                      <BetaButton
                        onClick={() => handleBanUser(user)}
                        size="sm"
                        variant="danger"
                      >
                        <Ban className="w-4 h-4" />
                      </BetaButton>
                    )}
                    {user.role !== 'admin' && (
                      <BetaButton
                        onClick={() => handleDeleteUser(user)}
                        size="sm"
                        variant="danger"
                        className="opacity-70 hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </BetaButton>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[hsl(var(--beta-surface-2))] border-[hsl(var(--beta-glass-border))] max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--beta-text-primary))]">Edit User</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6">
            {/* Basic User Info Section */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] border-b border-[hsl(var(--beta-glass-border))] pb-2">Basic Information</h3>
              
              <div className="flex flex-col gap-2">
                <Label className="text-[hsl(var(--beta-text-secondary))]">Discord Username</Label>
                <Input
                  value={editingUser?.discord_username || ''}
                  disabled
                  className="bg-[hsl(var(--beta-surface-4))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-muted))]"
                  placeholder="Cannot be edited - managed by Discord OAuth"
                />
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">Discord username is managed automatically and cannot be changed manually.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[hsl(var(--beta-text-secondary))]">Current Rank & Weight</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${editingUser?.current_rank || 'Unranked'} (Weight: ${editingUser?.weight_rating || 150})`}
                    disabled
                    className="bg-[hsl(var(--beta-surface-4))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-muted))] flex-1"
                  />
                  {editingUser?.riot_id && (
                    <BetaButton
                      onClick={() => editingUser && handleRefreshRank(editingUser)}
                      size="sm"
                      variant="outline"
                      disabled={refreshingRank === editingUser?.id}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${refreshingRank === editingUser?.id ? 'animate-spin' : ''}`} />
                      Refresh
                    </BetaButton>
                  )}
                </div>
                <div className="text-xs text-[hsl(var(--beta-text-muted))]">
                  <p>Peak Rank: {editingUser?.peak_rank || 'None'}</p>
                  <p>Rank and weight are updated through the rank scraping system.</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="role" className="text-[hsl(var(--beta-text-secondary))]">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: 'admin' | 'player' | 'viewer') => 
                    setEditForm(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))]">
                    <SelectItem value="player" className="text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-4))]">Player</SelectItem>
                    <SelectItem value="admin" className="text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-4))]">Admin</SelectItem>
                    <SelectItem value="viewer" className="text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-4))]">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="riot_id" className="text-[hsl(var(--beta-text-secondary))]">Riot ID</Label>
                <Input
                  id="riot_id"
                  value={editForm.riot_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, riot_id: e.target.value }))}
                  className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))]"
                  placeholder="PlayerName#TAG"
                />
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">Format: PlayerName#TAG (e.g., JohnDoe#1234)</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="spendable_points" className="text-[hsl(var(--beta-text-secondary))]">Achievement Points</Label>
                <Input
                  id="spendable_points"
                  type="number"
                  min="0"
                  value={editForm.spendable_points}
                  onChange={(e) => setEditForm(prev => ({ ...prev, spendable_points: parseInt(e.target.value) || 0 }))}
                  className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))]"
                  placeholder="0"
                />
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">Points the user can spend in the shop</p>
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
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] border-b border-[hsl(var(--beta-glass-border))] pb-2">Profile Information</h3>
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="bio" className="text-[hsl(var(--beta-text-secondary))]">Bio</Label>
                <Textarea
                  id="bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))]"
                  placeholder="User biography..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="twitter_handle" className="text-[hsl(var(--beta-text-secondary))]">Twitter Handle</Label>
                  <Input
                    id="twitter_handle"
                    value={editForm.twitter_handle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, twitter_handle: e.target.value }))}
                    className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))]"
                    placeholder="username (without @)"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="twitch_handle" className="text-[hsl(var(--beta-text-secondary))]">Twitch Handle</Label>
                  <Input
                    id="twitch_handle"
                    value={editForm.twitch_handle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, twitch_handle: e.target.value }))}
                    className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))]"
                    placeholder="username"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="profile_visibility" className="text-[hsl(var(--beta-text-secondary))]">Profile Visibility</Label>
                <Select
                  value={editForm.profile_visibility}
                  onValueChange={(value) => 
                    setEditForm(prev => ({ ...prev, profile_visibility: value }))
                  }
                >
                  <SelectTrigger className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))]">
                    <SelectItem value="public" className="text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-4))]">Public</SelectItem>
                    <SelectItem value="private" className="text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-4))]">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t border-[hsl(var(--beta-glass-border))]">
              <BetaButton
                variant="secondary"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </BetaButton>
              <BetaButton
                variant="primary"
                onClick={handleUpdateUser}
              >
                Update User
              </BetaButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="bg-[hsl(var(--beta-surface-2))] border-[hsl(var(--beta-glass-border))]">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--beta-text-primary))]">Ban User</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ban_reason" className="text-[hsl(var(--beta-text-secondary))]">Ban Reason</Label>
              <Input
                id="ban_reason"
                value={banForm.reason}
                onChange={(e) => setBanForm(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))]"
                placeholder="Reason for ban..."
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ban_expires" className="text-[hsl(var(--beta-text-secondary))]">Ban Expires (Optional)</Label>
              <Input
                id="ban_expires"
                type="datetime-local"
                value={banForm.expires_at}
                onChange={(e) => setBanForm(prev => ({ ...prev, expires_at: e.target.value }))}
                className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <BetaButton
                variant="secondary"
                onClick={() => setBanDialogOpen(false)}
              >
                Cancel
              </BetaButton>
              <BetaButton
                variant="danger"
                onClick={handleExecuteBan}
              >
                Ban User
              </BetaButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[hsl(var(--beta-surface-2))] border-[hsl(var(--beta-error)/0.3)]">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--beta-error))] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete User Permanently
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="bg-[hsl(var(--beta-error)/0.1)] border border-[hsl(var(--beta-error)/0.3)] rounded-[var(--beta-radius-md)] p-4">
              <p className="text-[hsl(var(--beta-text-primary))] text-sm font-medium mb-2">
                You are about to permanently delete:
              </p>
              <p className="text-[hsl(var(--beta-accent))] font-semibold">
                {editingUser?.discord_username || 'Unknown User'}
              </p>
              {editingUser?.riot_id && (
                <p className="text-[hsl(var(--beta-text-muted))] text-sm">{editingUser.riot_id}</p>
              )}
            </div>
            <p className="text-[hsl(var(--beta-text-secondary))] text-sm leading-relaxed">
              This action <span className="text-[hsl(var(--beta-error))] font-semibold">cannot be undone</span>. 
              All associated data including tournament signups, team memberships, stats, and notifications will be permanently removed.
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-[hsl(var(--beta-glass-border))]">
              <BetaButton
                variant="secondary"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deletingUser}
              >
                Cancel
              </BetaButton>
              <BetaButton
                variant="danger"
                onClick={handleExecuteDelete}
                isLoading={deletingUser}
                disabled={deletingUser}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Permanently
              </BetaButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
};

export default UserManagement;
