import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { BetaTeamRoster, BetaTeamStats, BetaOwnershipTransfer, BetaJoinCodeManager } from "@/components-beta/team";
import { 
  Shield, ArrowLeft, Trophy, Users, Calendar, Clock, 
  Crown, Lock, ExternalLink, Swords, Edit3, Save, Settings,
  Trash2, LogOut, AlertTriangle, ImagePlus, Upload, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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

const BetaTeamProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [team, setTeam] = useState<PersistentTeamV2 | null>(null);
  const [members, setMembers] = useState<PersistentTeamMemberV2[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Management state
  const [userRole, setUserRole] = useState<TeamMemberRole | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'settings'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwner = userRole === 'owner';
  const isManager = userRole === 'manager';
  const canManage = isOwner || isManager;
  const isMember = userRole !== null;

  useEffect(() => {
    if (id) {
      fetchTeamData();
    }
  }, [id, user]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from('persistent_teams')
        .select('*')
        .eq('id', id)
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
        .eq('team_id', id);

      const typedMembers = (membersData || []).map(m => ({
        ...m,
        role: m.role || 'player',
      })) as PersistentTeamMemberV2[];

      setMembers(typedMembers);

      // Determine current user's role
      if (user) {
        const currentUserMember = typedMembers.find(m => m.user_id === user.id);
        setUserRole(currentUserMember?.role as TeamMemberRole || null);
      } else {
        setUserRole(null);
      }

      // Fetch tournament history
      const { data: tournamentData } = await supabase
        .from('team_tournament_registrations')
        .select(`
          id,
          registered_at,
          status,
          seed,
          tournaments (id, name, status, start_time)
        `)
        .eq('team_id', id)
        .order('registered_at', { ascending: false })
        .limit(10);

      setTournaments(tournamentData || []);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  // Management handlers
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
    navigate('/teams');
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
    await fetchTeamData();
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
    navigate('/teams');
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !team) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${team.id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('team-banners')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-banners')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('persistent_teams')
        .update({ banner_image_url: publicUrl })
        .eq('id', team.id);

      if (updateError) throw updateError;

      setTeam({ ...team, banner_image_url: publicUrl } as any);
      toast({ title: "Success", description: "Team banner uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload banner", variant: "destructive" });
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleRemoveBanner = async () => {
    if (!team) return;
    setUploadingBanner(true);
    try {
      const { error: updateError } = await supabase
        .from('persistent_teams')
        .update({ banner_image_url: null })
        .eq('id', team.id);

      if (updateError) throw updateError;
      setTeam({ ...team, banner_image_url: null } as any);
      toast({ title: "Success", description: "Team banner removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to remove banner", variant: "destructive" });
    } finally {
      setUploadingBanner(false);
    }
  };

  const getStatusVariant = (status: TeamLifecycleStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'locked': return 'warning';
      case 'disbanded': return 'error';
      default: return 'default';
    }
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

  if (!team) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <GlassCard className="p-12 text-center">
            <Shield className="w-16 h-16 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">Team Not Found</h2>
            <p className="text-[hsl(var(--beta-text-muted))] mb-6">
              This team doesn't exist or has been removed.
            </p>
            <Link to="/teams">
              <BetaButton variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Teams
              </BetaButton>
            </Link>
          </GlassCard>
        </div>
      </GradientBackground>
    );
  }

  const owner = members.find(m => m.role === 'owner');
  const capitalizeStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  // Build tabs: always show overview, show roster/settings for members who can manage
  const tabs = canManage
    ? [
        { id: 'overview' as const, label: 'Overview', icon: <Shield className="w-4 h-4" /> },
        { id: 'roster' as const, label: 'Roster', icon: <Users className="w-4 h-4" /> },
        { id: 'settings' as const, label: 'Settings', icon: <Settings className="w-4 h-4" /> },
      ]
    : null;

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <Link to="/teams" className="inline-flex items-center gap-2 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>

        {/* Header with Banner */}
        <GlassCard variant="strong" className="overflow-hidden mb-8">
          {/* Banner */}
          <div className="relative h-36 md:h-48">
            {(team as any).banner_image_url ? (
              <img 
                src={(team as any).banner_image_url} 
                alt={`${team.name} banner`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--beta-accent)/0.3)] via-[hsl(var(--beta-surface-3))] to-[hsl(var(--beta-secondary)/0.3)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--beta-surface-2))] via-[hsl(var(--beta-surface-2)/0.5)] to-transparent" />
          </div>
          
          {/* Content below banner */}
          <div className="relative p-6 md:p-8 -mt-16">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              {/* Team Avatar */}
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))] flex items-center justify-center border-4 border-[hsl(var(--beta-surface-2))] shadow-lg">
                <Shield className="w-12 h-12 text-[hsl(var(--beta-surface-1))]" />
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--beta-text-primary))]">{team.name}</h1>
                  <BetaBadge variant={getStatusVariant(team.status)}>
                    {team.status === 'locked' && <Lock className="w-3 h-3 mr-1" />}
                    {capitalizeStatus(team.status)}
                  </BetaBadge>
                  {isMember && (
                    <BetaBadge variant="accent" size="sm">
                      <Crown className="w-3 h-3 mr-1" />
                      {capitalizeStatus(userRole || '')}
                    </BetaBadge>
                  )}
                </div>
                
                {team.description && (
                  <p className="text-[hsl(var(--beta-text-secondary))] mb-4">{team.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-[hsl(var(--beta-text-muted))]">
                  <div className="flex items-center gap-1">
                    <Crown className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                    <span>Owner: </span>
                    {owner ? (
                      <Link to={`/profile/${owner.user_id}`} className="text-[hsl(var(--beta-accent))] hover:underline">
                        {owner.users?.discord_username || 'Unknown'}
                      </Link>
                    ) : (
                      <span>Unknown</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created {format(new Date(team.created_at || Date.now()), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{members.length} / {team.max_members || 10} members</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Management Tabs (only for owner/manager) */}
        {tabs && (
          <div className="flex gap-2 mb-6 p-1 bg-[hsl(var(--beta-surface-2))] rounded-xl border border-[hsl(var(--beta-border))] w-fit overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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
        )}

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Team Info Edit (owner/manager only) */}
            {canManage && (
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">Team Information</h2>
                  {!isEditing && (
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
                  <p className="text-[hsl(var(--beta-text-secondary))]">
                    {team.description || 'No description set.'}
                  </p>
                )}
              </GlassCard>
            )}

            {/* Banner Upload (owner/manager only) */}
            {canManage && (
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ImagePlus className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                  <h2 className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">Team Banner</h2>
                </div>
                <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-4">
                  Upload a banner image for your team. Recommended size: 1200x300 pixels.
                </p>
                <div className="relative mb-4 rounded-xl overflow-hidden">
                  {(team as any).banner_image_url ? (
                    <div className="relative">
                      <img 
                        src={(team as any).banner_image_url} 
                        alt="Team banner"
                        className="w-full h-32 object-cover"
                      />
                      <button
                        onClick={handleRemoveBanner}
                        disabled={uploadingBanner}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-[hsl(var(--beta-surface-1)/0.8)] text-[hsl(var(--beta-error))] hover:bg-[hsl(var(--beta-error))] hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-[hsl(var(--beta-accent)/0.2)] via-[hsl(var(--beta-surface-3))] to-[hsl(var(--beta-secondary)/0.2)] flex items-center justify-center border-2 border-dashed border-[hsl(var(--beta-border))]">
                      <p className="text-[hsl(var(--beta-text-muted))] text-sm">No banner uploaded</p>
                    </div>
                  )}
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
                <BetaButton
                  variant="outline"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingBanner ? 'Uploading...' : (team as any).banner_image_url ? 'Change Banner' : 'Upload Banner'}
                </BetaButton>
              </GlassCard>
            )}

            {/* Stats */}
            <div>
              <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-4">Team Statistics</h2>
              <BetaTeamStats team={team} memberCount={members.length} />
            </div>

            {/* Join Code (owner/manager only) */}
            {canManage && (
              <BetaJoinCodeManager
                inviteCode={team.invite_code || ''}
                joinCodeVersion={team.join_code_version || 1}
                generatedAt={team.join_code_generated_at || team.created_at || new Date().toISOString()}
                onRegenerate={handleRegenerateJoinCode}
                canManage={canManage}
              />
            )}

            {/* Two Column Layout: Roster + Tournament History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Roster - 2 cols */}
              <div className="lg:col-span-2">
                <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                  Team Roster
                </h2>
                <BetaTeamRoster 
                  members={members}
                  isOwner={canManage ? isOwner : undefined}
                  isManager={canManage ? isManager : undefined}
                  currentUserId={canManage ? user?.id : undefined}
                  onRoleChange={canManage ? handleRoleChange : undefined}
                  onRemoveMember={canManage ? handleRemoveMember : undefined}
                />
              </div>

              {/* Tournament History - 1 col */}
              <div>
                <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                  Tournament History
                </h2>
                {tournaments.length === 0 ? (
                  <GlassCard className="p-6 text-center">
                    <Swords className="w-10 h-10 text-[hsl(var(--beta-text-muted))] mx-auto mb-2" />
                    <p className="text-[hsl(var(--beta-text-muted))]">No tournaments yet</p>
                  </GlassCard>
                ) : (
                  <div className="space-y-3">
                    {tournaments.map((reg, idx) => (
                      <Link key={reg.id} to={`/tournament/${reg.tournaments?.id}`}>
                        <GlassCard 
                          variant="interactive" 
                          hover 
                          className="p-4 beta-animate-fade-in"
                          style={{ animationDelay: `${idx * 50}ms` } as React.CSSProperties}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[hsl(var(--beta-text-primary))]">
                                {reg.tournaments?.name || 'Unknown Tournament'}
                              </p>
                              <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                                {reg.tournaments?.start_time 
                                  ? format(new Date(reg.tournaments.start_time), 'MMM d, yyyy')
                                  : 'Date TBD'
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {reg.seed && (
                                <BetaBadge variant="default" size="sm">#{reg.seed}</BetaBadge>
                              )}
                              <BetaBadge 
                                variant={reg.tournaments?.status === 'completed' ? 'success' : 'default'} 
                                size="sm"
                              >
                                {reg.tournaments?.status || 'Unknown'}
                              </BetaBadge>
                            </div>
                          </div>
                        </GlassCard>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Roster Tab (management view) */}
        {activeTab === 'roster' && canManage && (
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
                onRoleChange={handleRoleChange}
                onRemoveMember={handleRemoveMember}
              />
            </GlassCard>
          </div>
        )}

        {/* Settings Tab (management view) */}
        {activeTab === 'settings' && canManage && (
          <div className="space-y-6">
            {/* Ownership Transfer (Owner Only) */}
            {isOwner && (
              <BetaOwnershipTransfer
                members={members}
                currentOwnerId={user?.id || ''}
                onTransfer={handleTransferOwnership}
              />
            )}

            {/* Leave Team (Non-Owner members) */}
            {isMember && !isOwner && (
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

export default BetaTeamProfile;
