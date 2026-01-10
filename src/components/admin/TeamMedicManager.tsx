/**
 * Team Medic Manager - Admin tool for managing persistent teams
 * Allows admins to view, edit, delete teams and manage member roles
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  Edit,
  Trash2,
  UserMinus,
  UserPlus,
  Crown,
  RefreshCw,
  Search,
  AlertTriangle,
} from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  status: string;
  owner_id: string | null;
  captain_id: string;
  is_active: boolean;
  created_at: string;
  wins: number;
  losses: number;
  tournaments_won: number;
  tournaments_played: number;
  members: TeamMember[];
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  users: {
    discord_username: string;
    current_rank: string;
  } | null;
}

type TeamMemberRole = 'owner' | 'manager' | 'captain' | 'player' | 'substitute' | 'analyst' | 'coach';
type TeamLifecycleStatus = 'active' | 'locked' | 'disbanded' | 'archived';

const ROLES: TeamMemberRole[] = ['owner', 'manager', 'captain', 'player', 'substitute', 'analyst', 'coach'];
const STATUSES: TeamLifecycleStatus[] = ['active', 'locked', 'disbanded', 'archived'];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    case 'manager': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    case 'captain': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    case 'player': return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    case 'substitute': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    case 'analyst': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
    case 'coach': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-500/20 text-green-400 border-green-500/50';
    case 'locked': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    case 'disbanded': return 'bg-red-500/20 text-red-400 border-red-500/50';
    case 'archived': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
  }
};

export const TeamMedicManager = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "active" as TeamLifecycleStatus,
  });
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('persistent_teams')
        .select(`
          *,
          members:persistent_team_members (
            id,
            user_id,
            role,
            joined_at,
            users (discord_username, current_rank)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading teams",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.members?.some(m => m.users?.discord_username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setEditForm({
      name: team.name,
      description: team.description || "",
      status: team.status as TeamLifecycleStatus,
    });
    setEditDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!selectedTeam) return;

    try {
      const { error } = await supabase.rpc('admin_update_team', {
        p_team_id: selectedTeam.id,
        p_name: editForm.name,
        p_description: editForm.description || null,
        p_status: editForm.status,
      });

      if (error) throw error;

      toast({
        title: "Team updated",
        description: `${editForm.name} has been updated successfully.`,
      });

      setEditDialogOpen(false);
      fetchTeams();
    } catch (error: any) {
      toast({
        title: "Error updating team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    try {
      const { error } = await supabase.rpc('admin_delete_team', {
        p_team_id: team.id,
      });

      if (error) throw error;

      toast({
        title: "Team deleted",
        description: `${team.name} has been permanently deleted.`,
      });

      fetchTeams();
    } catch (error: any) {
      toast({
        title: "Error deleting team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateMemberRole = async (teamId: string, userId: string, newRole: TeamMemberRole) => {
    try {
      const { error } = await supabase.rpc('admin_update_member_role', {
        p_team_id: teamId,
        p_user_id: userId,
        p_role: newRole,
      });

      if (error) throw error;

      toast({
        title: "Role updated",
        description: `Member role changed to ${newRole}.`,
      });

      fetchTeams();
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string, username: string) => {
    try {
      const { error } = await supabase.rpc('admin_remove_team_member', {
        p_team_id: teamId,
        p_user_id: userId,
      });

      if (error) throw error;

      toast({
        title: "Member removed",
        description: `${username} has been removed from the team.`,
      });

      fetchTeams();
    } catch (error: any) {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTransferOwnership = async (teamId: string, newOwnerId: string) => {
    try {
      const { error } = await supabase.rpc('admin_update_team', {
        p_team_id: teamId,
        p_owner_id: newOwnerId,
        p_captain_id: newOwnerId,
      });

      if (error) throw error;

      toast({
        title: "Ownership transferred",
        description: "Team ownership has been transferred successfully.",
      });

      fetchTeams();
      setMemberDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error transferring ownership",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <CardTitle className="text-white">Team Manager</CardTitle>
          <Badge variant="outline" className="text-blue-400 border-blue-400">
            {teams.length} teams
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTeams}
          disabled={loading}
          className="border-slate-600"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search teams or players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600 text-white"
          />
        </div>

        {/* Teams Table */}
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                <TableHead className="text-slate-300">Team</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Members</TableHead>
                <TableHead className="text-slate-300">Stats</TableHead>
                <TableHead className="text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading teams...
                  </TableCell>
                </TableRow>
              ) : filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    No teams found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team) => (
                  <TableRow key={team.id} className="hover:bg-slate-700/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{team.name}</p>
                          <p className="text-xs text-slate-400">
                            Created {new Date(team.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(team.status)}>
                        {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-white">{team.members?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-green-400">{team.wins || 0}W</span>
                        <span className="text-slate-500 mx-1">-</span>
                        <span className="text-red-400">{team.losses || 0}L</span>
                        <span className="text-slate-500 mx-2">|</span>
                        <span className="text-amber-400">{team.tournaments_won || 0} 🏆</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View/Edit Members */}
                        <Dialog open={memberDialogOpen && selectedTeam?.id === team.id} onOpenChange={(open) => {
                          setMemberDialogOpen(open);
                          if (open) setSelectedTeam(team);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-slate-600">
                              <Users className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-white flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                {team.name} - Members
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {team.members?.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                                  <p>No members in this team</p>
                                </div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="text-slate-300">Player</TableHead>
                                      <TableHead className="text-slate-300">Role</TableHead>
                                      <TableHead className="text-slate-300">Rank</TableHead>
                                      <TableHead className="text-slate-300 text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {team.members?.map((member) => (
                                      <TableRow key={member.id} className="hover:bg-slate-700/50">
                                        <TableCell className="text-white">
                                          {member.users?.discord_username || 'Unknown'}
                                        </TableCell>
                                        <TableCell>
                                          <Select
                                            value={member.role}
                                            onValueChange={(value: TeamMemberRole) => 
                                              handleUpdateMemberRole(team.id, member.user_id, value)
                                            }
                                          >
                                            <SelectTrigger className="w-32 bg-slate-700 border-slate-600">
                                              <Badge className={getRoleBadgeColor(member.role)}>
                                                {member.role}
                                              </Badge>
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-700 border-slate-600">
                                              {ROLES.map((role) => (
                                                <SelectItem key={role} value={role}>
                                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="text-slate-300 border-slate-500">
                                            {member.users?.current_rank || 'Unranked'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            {/* Transfer Ownership */}
                                            {member.role !== 'owner' && (
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="outline" size="sm" className="border-amber-600 text-amber-400 hover:bg-amber-600/20">
                                                    <Crown className="w-4 h-4" />
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-800 border-slate-700">
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-white">Transfer Ownership</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-400">
                                                      Transfer team ownership to {member.users?.discord_username}? 
                                                      The current owner will be demoted to player.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                                                      Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction
                                                      className="bg-amber-600 hover:bg-amber-700"
                                                      onClick={() => handleTransferOwnership(team.id, member.user_id)}
                                                    >
                                                      Transfer
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            )}
                                            {/* Remove Member */}
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20">
                                                  <UserMinus className="w-4 h-4" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent className="bg-slate-800 border-slate-700">
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle className="text-white">Remove Member</AlertDialogTitle>
                                                  <AlertDialogDescription className="text-slate-400">
                                                    Remove {member.users?.discord_username} from {team.name}?
                                                    This action cannot be undone.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                                                    Cancel
                                                  </AlertDialogCancel>
                                                  <AlertDialogAction
                                                    className="bg-red-600 hover:bg-red-700"
                                                    onClick={() => handleRemoveMember(
                                                      team.id, 
                                                      member.user_id, 
                                                      member.users?.discord_username || 'Unknown'
                                                    )}
                                                  >
                                                    Remove
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Edit Team */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600"
                          onClick={() => handleEditTeam(team)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        {/* Delete Team */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Delete Team</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Permanently delete {team.name}? This will remove all members, 
                                registrations, and history. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDeleteTeam(team)}
                              >
                                Delete Team
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Team Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Edit Team
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Update team details. Changes will take effect immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Team Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value: TeamLifecycleStatus) => 
                    setEditForm(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-slate-600"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTeam} className="bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TeamMedicManager;
