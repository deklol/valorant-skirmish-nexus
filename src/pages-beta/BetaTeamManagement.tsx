import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { BetaTeamRoster, BetaTeamStats, BetaOwnershipTransfer, BetaJoinCodeManager } from "@/components-beta/team";
import { 
  Shield, ArrowLeft, Save, Trash2, LogOut, Users, 
  Settings, Crown, Lock, Unlock, Edit3, AlertTriangle,
  Plus, UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTeamManagementV2 } from "@/hooks/useTeamManagementV2";
import { PersistentTeamV2, PersistentTeamMemberV2, TeamLifecycleStatus, TeamMemberRole } from "@/types/teamV2";
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

const BetaTeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState<PersistentTeamV2 | null>(null);
  const [members, setMembers] = useState<PersistentTeamMemberV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'settings'>('overview');
  
  // Edit states
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // User role info
  const [userRole, setUserRole] = useState<TeamMemberRole | null>(null);
  const isOwner = userRole === 'owner';
  const isManager = userRole === 'manager';
  const canManage = isOwner || isManager;

  useEffect(() => {
    if (user) {
      fetchUserTeam();
    }
  }, [user]);

  const fetchUserTeam = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Check if user is in a team
      const { data: memberData } = await supabase
        .from('persistent_team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData) {
        setTeam(null);
        setLoading(false);
        return;
      }

      setUserRole(memberData.role as TeamMemberRole);

      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from('persistent_teams')
        .select('*')
        .eq('id', memberData.team_id)
        .maybeSingle();

      if (teamError) throw teamError;
      if (!teamData) {
        setTeam(null);
        return;
      }

      const mappedTeam = {
        ...teamData,
        status: (teamData.status || 'active') as TeamLifecycleStatus,
      } as PersistentTeamV2;

      setTeam(mappedTeam);
      setEditedName(mappedTeam.name);
      setEditedDescription(mappedTeam.description || '');

      // Fetch members
      const { data: membersData } = await supabase
        .from('persistent_team_members')
        .select(`
          id,
          team_id,
          user_id,
          role,
          joined_at,
          users (id, discord_username, current_rank, riot_id, rank_points, weight_rating)
        `)
        .eq('team_id', memberData.team_id);

      setMembers((membersData || []).map(m => ({
        ...m,
        role: m.role || 'player',
      })) as PersistentTeamMemberV2[]);
    } catch (error) {
      console.error('Error fetching team:', error);
      toast({ title: "Error", description: "Failed to load team data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeamInfo = async () => {
    if (!team || !canManage) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('persistent_teams')
        .update({
          name: editedName.trim(),
          description: editedDescription.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', team.id);

      if (error) throw error;
      
      setTeam({ ...team, name: editedName.trim(), description: editedDescription.trim() || null });
      setIsEditing(false);
      toast({ title: "Saved!", description: "Team info updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: TeamMemberRole) => {
    const { error } = await supabase
      .from('persistent_team_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    toast({ title: "Role updated", description: "Member role has been changed" });
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase
      .from('persistent_team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setMembers(members.filter(m => m.id !== memberId));
    toast({ title: "Member removed", description: "Player has been removed from the team" });
  };

  const handleLeaveTeam = async () => {
    if (!team || !user || isOwner) return;
    
    const { error } = await supabase
      .from('persistent_team_members')
      .delete()
      .eq('team_id', team.id)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Left team", description: "You have left the team" });
    navigate('/beta/teams');
  };

  const handleTransferOwnership = async (newOwnerId: string, newRoleForSelf: TeamMemberRole) => {
    if (!team) return;
    
    const { data, error } = await supabase.rpc('transfer_team_ownership', {
      p_team_id: team.id,
      p_new_owner_id: newOwnerId,
      p_new_role_for_old_owner: newRoleForSelf,
    });

    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast({ title: "Error", description: result?.error || error?.message, variant: "destructive" });
      return;
    }

    toast({ title: "Ownership transferred", description: "Team ownership has been transferred" });
    await fetchUserTeam();
  };

  const handleRegenerateJoinCode = async () => {
    if (!team) return;
    
    const { data, error } = await supabase.rpc('rotate_team_join_code', {
      p_team_id: team.id,
      p_trigger: 'manual',
      p_triggered_by: user?.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setTeam({ ...team, invite_code: data, join_code_version: (team.join_code_version || 0) + 1 });
  };

  const handleDisbandTeam = async () => {
    if (!team) return;
    
    const { data, error } = await supabase.rpc('disband_team', {
      p_team_id: team.id,
    });

    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast({ title: "Error", description: result?.error || error?.message, variant: "destructive" });
      return;
    }

    toast({ title: "Team disbanded", description: "Your team has been disbanded" });
    navigate('/beta/teams');
  };

  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Shield className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading team...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  // No team - show create team UI
  if (!team) {
    return <NoTeamView userId={user?.id} onTeamCreated={fetchUserTeam} />;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Shield className="w-4 h-4" /> },
    { id: 'roster', label: 'Roster', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <Link to="/beta/teams" className="inline-flex items-center gap-2 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>

        {/* Header */}
        <GlassCard variant="strong" className="p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))] flex items-center justify-center">
                <Shield className="w-8 h-8 text-[hsl(var(--beta-surface-1))]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">{team.name}</h1>
                  <BetaBadge variant={team.status === 'active' ? 'success' : team.status === 'locked' ? 'warning' : 'default'}>
                    {team.status === 'locked' && <Lock className="w-3 h-3 mr-1" />}
                    {team.status}
                  </BetaBadge>
                </div>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  Your role: <span className="text-[hsl(var(--beta-accent))] capitalize">{userRole}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to={`/beta/team/${team.id}`}>
                <BetaButton variant="outline" size="sm">
                  View Public Profile
                </BetaButton>
              </Link>
            </div>
          </div>
        </GlassCard>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-[hsl(var(--beta-surface-2))] rounded-xl border border-[hsl(var(--beta-border))] w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))]'
                  : 'text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Team Info Edit */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">Team Information</h2>
                {canManage && !isEditing && (
                  <BetaButton variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-1" />
                    Edit
                  </BetaButton>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">Team Name</label>
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] rounded-lg px-4 py-2.5 text-[hsl(var(--beta-text-primary))]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">Description</label>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] rounded-lg px-4 py-2.5 text-[hsl(var(--beta-text-primary))] resize-none"
                      placeholder="Tell others about your team..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <BetaButton onClick={handleSaveTeamInfo} disabled={saving}>
                      <Save className="w-4 h-4 mr-1" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </BetaButton>
                    <BetaButton variant="ghost" onClick={() => {
                      setIsEditing(false);
                      setEditedName(team.name);
                      setEditedDescription(team.description || '');
                    }}>
                      Cancel
                    </BetaButton>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[hsl(var(--beta-text-secondary))]">
                    {team.description || 'No description set.'}
                  </p>
                </div>
              )}
            </GlassCard>

            {/* Stats */}
            <BetaTeamStats team={team} memberCount={members.length} />

            {/* Join Code */}
            <BetaJoinCodeManager
              inviteCode={team.invite_code || ''}
              joinCodeVersion={team.join_code_version || 1}
              generatedAt={team.join_code_generated_at || team.created_at || new Date().toISOString()}
              onRegenerate={handleRegenerateJoinCode}
              canManage={canManage}
            />
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-[hsl(var(--beta-text-primary))] mb-4">
                Team Roster ({members.length} / {team.max_members || 10})
              </h2>
              <BetaTeamRoster
                members={members}
                isOwner={isOwner}
                isManager={isManager}
                currentUserId={user?.id}
                onRoleChange={canManage ? handleRoleChange : undefined}
                onRemoveMember={canManage ? handleRemoveMember : undefined}
              />
            </GlassCard>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Ownership Transfer (Owner Only) */}
            {isOwner && (
              <BetaOwnershipTransfer
                members={members}
                currentOwnerId={user?.id || ''}
                onTransfer={handleTransferOwnership}
              />
            )}

            {/* Leave Team (Non-Owner) */}
            {!isOwner && (
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--beta-surface-4))] flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-[hsl(var(--beta-warning))]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[hsl(var(--beta-text-primary))]">Leave Team</h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                      Leave this team and become a free agent
                    </p>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <BetaButton variant="outline" className="text-[hsl(var(--beta-warning))] border-[hsl(var(--beta-warning)/0.5)]">
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave Team
                    </BetaButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[hsl(var(--beta-surface-2))] border-[hsl(var(--beta-border))]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-[hsl(var(--beta-text-primary))]">
                        Leave {team.name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-[hsl(var(--beta-text-muted))]">
                        You will need to be re-invited to rejoin this team.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-primary))] border-[hsl(var(--beta-border))]">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeaveTeam} className="bg-[hsl(var(--beta-warning))] text-white">
                        Leave Team
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </GlassCard>
            )}

            {/* Disband Team (Owner Only) */}
            {isOwner && (
              <GlassCard className="p-6 border-[hsl(var(--beta-error)/0.3)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--beta-error)/0.1)] flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-[hsl(var(--beta-error))]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[hsl(var(--beta-text-primary))]">Disband Team</h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                      Permanently delete this team and remove all members
                    </p>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <BetaButton variant="danger">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Disband Team
                    </BetaButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[hsl(var(--beta-surface-2))] border-[hsl(var(--beta-border))]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-[hsl(var(--beta-text-primary))] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[hsl(var(--beta-error))]" />
                        Disband {team.name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-[hsl(var(--beta-text-muted))]">
                        This action cannot be undone. All team members will be removed and the team will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-primary))] border-[hsl(var(--beta-border))]">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisbandTeam} className="bg-[hsl(var(--beta-error))] text-white">
                        Disband Team
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </GradientBackground>
  );
};

// NoTeamView component for creating or joining a team
const NoTeamView = ({ userId, onTeamCreated }: { userId?: string; onTeamCreated: () => void }) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateTeam = async () => {
    if (!userId || !teamName.trim()) {
      toast({ title: "Error", description: "Team name is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Create the team
      const { data: team, error: teamError } = await supabase
        .from('persistent_teams')
        .insert({
          name: teamName.trim(),
          description: teamDescription.trim() || null,
          captain_id: userId,
          owner_id: userId,
          status: 'active',
          invite_code: crypto.randomUUID().slice(0, 8).toUpperCase(),
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('persistent_team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: 'owner',
        });

      if (memberError) throw memberError;

      toast({ title: "Team Created!", description: `Welcome to ${team.name}!` });
      onTeamCreated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!userId || !joinCode.trim()) {
      toast({ title: "Error", description: "Join code is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Find team by invite code
      const { data: team, error: teamError } = await supabase
        .from('persistent_teams')
        .select('id, name, max_members')
        .eq('invite_code', joinCode.trim().toUpperCase())
        .eq('status', 'active')
        .maybeSingle();

      if (teamError) throw teamError;
      if (!team) {
        toast({ title: "Invalid Code", description: "No active team found with that join code", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Check member count
      const { count } = await supabase
        .from('persistent_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id);

      if (count && team.max_members && count >= team.max_members) {
        toast({ title: "Team Full", description: "This team has reached its maximum capacity", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Join the team
      const { error: joinError } = await supabase
        .from('persistent_team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: 'player',
        });

      if (joinError) throw joinError;

      toast({ title: "Joined Team!", description: `Welcome to ${team.name}!` });
      onTeamCreated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {mode === 'select' && (
            <GlassCard className="p-8 text-center">
              <Shield className="w-16 h-16 text-[hsl(var(--beta-accent))] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">No Team Yet</h2>
              <p className="text-[hsl(var(--beta-text-muted))] mb-6">
                Create your own team or join an existing one with a join code.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <BetaButton onClick={() => setMode('create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </BetaButton>
                <BetaButton variant="outline" onClick={() => setMode('join')}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Team
                </BetaButton>
              </div>
            </GlassCard>
          )}

          {mode === 'create' && (
            <GlassCard className="p-6">
              <button 
                onClick={() => setMode('select')}
                className="text-sm text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                Create New Team
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter team name"
                    maxLength={30}
                    className="w-full bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] rounded-lg px-4 py-2.5 text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="Tell others about your team..."
                    rows={3}
                    maxLength={200}
                    className="w-full bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] rounded-lg px-4 py-2.5 text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] resize-none"
                  />
                </div>
                <BetaButton 
                  className="w-full" 
                  onClick={handleCreateTeam} 
                  disabled={loading || !teamName.trim()}
                >
                  {loading ? 'Creating...' : 'Create Team'}
                </BetaButton>
              </div>
            </GlassCard>
          )}

          {mode === 'join' && (
            <GlassCard className="p-6">
              <button 
                onClick={() => setMode('select')}
                className="text-sm text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                Join Existing Team
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
                    Team Join Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character code"
                    maxLength={8}
                    className="w-full bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] rounded-lg px-4 py-2.5 text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] font-mono text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-2">
                    Get this code from your team captain
                  </p>
                </div>
                <BetaButton 
                  className="w-full" 
                  onClick={handleJoinTeam} 
                  disabled={loading || joinCode.length < 6}
                >
                  {loading ? 'Joining...' : 'Join Team'}
                </BetaButton>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </GradientBackground>
  );
};

export default BetaTeamManagement;
