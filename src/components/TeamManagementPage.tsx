import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Crown, UserMinus, Settings, Copy, LogOut, Plus } from "lucide-react";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Username } from "@/components/Username";

const TeamManagementPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    userTeam,
    loading,
    createTeam,
    joinTeamByCode,
    leaveTeam,
    removeMember,
    updateTeam,
    deleteTeam,
  } = useTeamManagement();

  const [createTeamDialog, setCreateTeamDialog] = useState(false);
  const [joinTeamDialog, setJoinTeamDialog] = useState(false);
  const [editTeamDialog, setEditTeamDialog] = useState(false);
  
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="h-32 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    const success = await createTeam(teamName.trim(), teamDescription.trim() || undefined);
    if (success) {
      setCreateTeamDialog(false);
      setTeamName("");
      setTeamDescription("");
    }
  };

  const handleJoinTeam = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Error",
        description: "Invite code is required",
        variant: "destructive",
      });
      return;
    }

    const success = await joinTeamByCode(inviteCode.trim());
    if (success) {
      setJoinTeamDialog(false);
      setInviteCode("");
    }
  };

  const handleEditTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    const success = await updateTeam({
      name: teamName.trim(),
      description: teamDescription.trim() || null,
    });
    if (success) {
      setEditTeamDialog(false);
    }
  };

  const copyInviteCode = () => {
    if (userTeam?.invite_code) {
      navigator.clipboard.writeText(userTeam.invite_code);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard",
      });
    }
  };

  const openEditDialog = () => {
    if (userTeam) {
      setTeamName(userTeam.name);
      setTeamDescription(userTeam.description || "");
      setEditTeamDialog(true);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Please sign in to manage your team</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team Management</h1>
      </div>

      {!userTeam ? (
        // No team - show create/join options
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Team
              </CardTitle>
              <CardDescription>
                Create your own team and invite other players
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={createTeamDialog} onOpenChange={setCreateTeamDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full" disabled>Create New Team</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                    <DialogDescription>
                      Create a team and get a unique invite code to share with other players
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="team-name">Team Name</Label>
                      <Input
                        id="team-name"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter team name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="team-description">Description (Optional)</Label>
                      <Textarea
                        id="team-description"
                        value={teamDescription}
                        onChange={(e) => setTeamDescription(e.target.value)}
                        placeholder="Team description..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateTeamDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTeam}>Create Team</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Join Team
              </CardTitle>
              <CardDescription>
                Join an existing team using a 4-digit invite code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={joinTeamDialog} onOpenChange={setJoinTeamDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">Join Existing Team</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join Team</DialogTitle>
                    <DialogDescription>
                      Enter the 4-digit invite code provided by the team captain
                    </DialogDescription>
                  </DialogHeader>
                  <div>
                    <Label htmlFor="invite-code">Invite Code</Label>
                    <Input
                      id="invite-code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="0000"
                      maxLength={4}
                      className="text-center text-2xl tracking-widest"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setJoinTeamDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleJoinTeam}>Join Team</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      ) : (
        // User has a team - show team details
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {userTeam.is_user_captain && <Crown className="h-5 w-5 text-yellow-500" />}
                    {userTeam.name}
                  </CardTitle>
                  <CardDescription>{userTeam.description || "No description"}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {userTeam.member_count}/{userTeam.max_members} Members
                  </Badge>
                  {userTeam.is_user_captain && (
                    <Button variant="outline" size="sm" onClick={openEditDialog}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invite Code Section */}
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Team Invite Code</h3>
                    <p className="text-sm text-slate-400">Share this code with players to invite them</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-mono tracking-widest bg-slate-700 px-3 py-2 rounded">
                      {userTeam.invite_code}
                    </span>
                    <Button variant="outline" size="sm" onClick={copyInviteCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Team Members */}
              <div>
                <h3 className="font-semibold mb-3">Team Members</h3>
                <div className="space-y-2">
                  {userTeam.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        {member.is_captain && <Crown className="h-4 w-4 text-yellow-500" />}
                        <div>
                          <Username username={member.users.discord_username} userId={member.users.id} size="sm" className="font-medium" />
                          <p className="text-sm text-slate-400">
                            {member.users.current_rank} • {member.users.riot_id}
                          </p>
                        </div>
                      </div>
                      {userTeam.is_user_captain && !member.is_captain && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.users.discord_username} from the team?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeMember(member.id)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Team Actions */}
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave Team
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave Team</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to leave this team? You'll need a new invite code to rejoin.
                        {userTeam.is_user_captain && " As the captain, leaving will delete the team."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={leaveTeam}>Leave Team</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {userTeam.is_user_captain && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete Team</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this team? This action cannot be undone and will remove all members from the team.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteTeam} className="bg-red-600 hover:bg-red-700">
                          Delete Team
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={editTeamDialog} onOpenChange={setEditTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update your team's name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div>
              <Label htmlFor="edit-team-description">Description (Optional)</Label>
              <Textarea
                id="edit-team-description"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Team description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeamDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTeam}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default TeamManagementPage;