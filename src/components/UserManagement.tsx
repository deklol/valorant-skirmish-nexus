
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Edit, Ban, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserData {
  id: string;
  discord_username: string | null;
  riot_id: string | null;
  current_rank: string | null;
  rank_points: number | null;
  role: string;
  is_banned: boolean | null;
  ban_reason: string | null;
  created_at: string;
  wins: number | null;
  losses: number | null;
  tournaments_played: number | null;
  tournaments_won: number | null;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editFormData, setEditFormData] = useState({
    discord_username: '',
    riot_id: '',
    current_rank: '',
    role: 'player'
  });
  const [banFormData, setBanFormData] = useState({
    ban_reason: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      (user.discord_username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.riot_id?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setEditFormData({
      discord_username: user.discord_username || '',
      riot_id: user.riot_id || '',
      current_rank: user.current_rank || '',
      role: user.role
    });
    setEditDialogOpen(true);
  };

  const handleBanUser = (user: UserData) => {
    setSelectedUser(user);
    setBanFormData({ ban_reason: '' });
    setBanDialogOpen(true);
  };

  const submitUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          discord_username: editFormData.discord_username || null,
          riot_id: editFormData.riot_id || null,
          current_rank: editFormData.current_rank || null,
          role: editFormData.role
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "User Updated",
        description: `${editFormData.discord_username || selectedUser.id} has been updated successfully`,
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
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

  const submitBanToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const newBanStatus = !selectedUser.is_banned;
      
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: newBanStatus,
          ban_reason: newBanStatus ? banFormData.ban_reason : null
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Create audit log entry
      await supabase
        .from('audit_logs')
        .insert({
          action: newBanStatus ? 'user_banned' : 'user_unbanned',
          details: {
            user_id: selectedUser.id,
            username: selectedUser.discord_username,
            reason: newBanStatus ? banFormData.ban_reason : 'Unbanned'
          }
        });

      toast({
        title: newBanStatus ? "User Banned" : "User Unbanned",
        description: `${selectedUser.discord_username || selectedUser.id} has been ${newBanStatus ? 'banned' : 'unbanned'}`,
      });

      setBanDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating ban status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update ban status",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Admin</Badge>;
      case 'moderator':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Moderator</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Player</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
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
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          User Management
        </CardTitle>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search by username or Riot ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="player">Player</SelectItem>
            </SelectContent>
          </Select>
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
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Stats</TableHead>
                <TableHead className="text-slate-300">Joined</TableHead>
                <TableHead className="text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-white">
                    {user.discord_username || 'N/A'}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {user.riot_id || 'N/A'}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {user.current_rank || 'Unranked'}
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        Banned
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-300 text-sm">
                    <div>W: {user.wins || 0} / L: {user.losses || 0}</div>
                    <div>Tournaments: {user.tournaments_played || 0}</div>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {formatDate(user.created_at)}
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
                      <Button
                        onClick={() => handleBanUser(user)}
                        size="sm"
                        variant="outline"
                        className={`${
                          user.is_banned
                            ? 'border-green-600 text-green-400'
                            : 'border-red-600 text-red-400'
                        }`}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-400">No users found matching your criteria.</p>
          </div>
        )}
      </CardContent>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitUserEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discord_username" className="text-white">Discord Username</Label>
              <Input
                id="discord_username"
                value={editFormData.discord_username}
                onChange={(e) => setEditFormData(prev => ({ ...prev, discord_username: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="riot_id" className="text-white">Riot ID</Label>
              <Input
                id="riot_id"
                value={editFormData.riot_id}
                onChange={(e) => setEditFormData(prev => ({ ...prev, riot_id: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_rank" className="text-white">Current Rank</Label>
              <Select
                value={editFormData.current_rank}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, current_rank: value }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Iron">Iron</SelectItem>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                  <SelectItem value="Diamond">Diamond</SelectItem>
                  <SelectItem value="Ascendant">Ascendant</SelectItem>
                  <SelectItem value="Immortal">Immortal</SelectItem>
                  <SelectItem value="Radiant">Radiant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-white">Role</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Update User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ban/Unban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedUser?.is_banned ? 'Unban User' : 'Ban User'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitBanToggle} className="space-y-4">
            {!selectedUser?.is_banned && (
              <div className="space-y-2">
                <Label htmlFor="ban_reason" className="text-white">Ban Reason</Label>
                <Input
                  id="ban_reason"
                  value={banFormData.ban_reason}
                  onChange={(e) => setBanFormData(prev => ({ ...prev, ban_reason: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter reason for ban..."
                  required
                />
              </div>
            )}
            {selectedUser?.is_banned && (
              <p className="text-slate-300">
                Current ban reason: <span className="text-white">{selectedUser.ban_reason}</span>
              </p>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBanDialogOpen(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={selectedUser?.is_banned 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-red-600 hover:bg-red-700"
                }
              >
                {selectedUser?.is_banned ? 'Unban User' : 'Ban User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserManagement;
