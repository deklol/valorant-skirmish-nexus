
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Edit, Ban, Shield, ShieldOff, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserData {
  id: string;
  discord_username: string | null;
  riot_id: string | null;
  current_rank: string | null;
  role: 'admin' | 'player' | 'viewer';
  is_banned: boolean;
  ban_reason: string | null;
  ban_expires_at: string | null;
  wins: number;
  losses: number;
  tournaments_played: number;
  tournaments_won: number;
  created_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [banForm, setBanForm] = useState({
    reason: '',
    expires_at: ''
  });
  const [editForm, setEditForm] = useState({
    discord_username: '',
    riot_id: '',
    role: 'player' as 'admin' | 'player' | 'viewer'
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
        .select('*')
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

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setEditForm({
      discord_username: user.discord_username || '',
      riot_id: user.riot_id || '',
      role: user.role
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          discord_username: editForm.discord_username || null,
          riot_id: editForm.riot_id || null,
          role: editForm.role
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Log the audit action
      await supabase
        .from('audit_logs')
        .insert({
          action: 'user_updated',
          table_name: 'users',
          record_id: editingUser.id,
          old_values: {
            discord_username: editingUser.discord_username,
            riot_id: editingUser.riot_id,
            role: editingUser.role
          },
          new_values: editForm
        });

      toast({
        title: "User Updated",
        description: `${editForm.discord_username || 'User'} has been updated successfully`,
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
                <TableHead className="text-slate-300">Rank</TableHead>
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
                    {user.discord_username || 'No username'}
                  </TableCell>
                  <TableCell className="text-white">
                    {user.riot_id || 'No Riot ID'}
                  </TableCell>
                  <TableCell className="text-white">
                    {user.current_rank || 'Unranked'}
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

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discord_username" className="text-white">Discord Username</Label>
                <Input
                  id="discord_username"
                  value={editForm.discord_username}
                  onChange={(e) => setEditForm(prev => ({ ...prev, discord_username: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="riot_id" className="text-white">Riot ID</Label>
                <Input
                  id="riot_id"
                  value={editForm.riot_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, riot_id: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
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
                  <SelectContent>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
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
