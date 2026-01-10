import { Link } from "react-router-dom";
import { GlassCard, BetaBadge, BetaButton } from "@/components-beta/ui-beta";
import { Crown, Shield, User, UserMinus, ChevronDown } from "lucide-react";
import { PersistentTeamMemberV2, TeamMemberRole, ROLE_PERMISSIONS } from "@/types/teamV2";
import { getRankColor, getRankIcon } from "@/utils/rankUtils";
import { useState } from "react";

interface BetaTeamRosterProps {
  members: PersistentTeamMemberV2[];
  isOwner?: boolean;
  isManager?: boolean;
  onRoleChange?: (memberId: string, newRole: TeamMemberRole) => Promise<void>;
  onRemoveMember?: (memberId: string) => Promise<void>;
  currentUserId?: string;
}

const roleIcons: Record<TeamMemberRole, React.ReactNode> = {
  owner: <Crown className="w-4 h-4 text-[hsl(var(--beta-accent))]" />,
  manager: <Shield className="w-4 h-4 text-[hsl(var(--beta-secondary))]" />,
  captain: <Shield className="w-4 h-4 text-[hsl(var(--beta-text-secondary))]" />,
  player: <User className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />,
  substitute: <User className="w-4 h-4 text-[hsl(var(--beta-text-muted))] opacity-50" />,
  analyst: <User className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />,
  coach: <User className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />,
};

const rolePriority: Record<TeamMemberRole, number> = {
  owner: 0,
  manager: 1,
  captain: 2,
  player: 3,
  substitute: 4,
  analyst: 5,
  coach: 6,
};

const editableRoles: TeamMemberRole[] = ['manager', 'captain', 'player', 'substitute', 'analyst', 'coach'];

export const BetaTeamRoster = ({
  members,
  isOwner = false,
  isManager = false,
  onRoleChange,
  onRemoveMember,
  currentUserId,
}: BetaTeamRosterProps) => {
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const sortedMembers = [...members].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);

  const canEditMember = (member: PersistentTeamMemberV2) => {
    if (member.role === 'owner') return false; // Can't edit owner
    if (isOwner) return true; // Owner can edit anyone except themselves
    if (isManager && member.role !== 'manager') return true; // Manager can edit non-managers
    return false;
  };

  const canRemoveMember = (member: PersistentTeamMemberV2) => {
    if (member.role === 'owner') return false;
    if (member.user_id === currentUserId) return false; // Can't remove self this way
    return canEditMember(member);
  };

  const handleRoleChange = async (memberId: string, newRole: TeamMemberRole) => {
    if (!onRoleChange) return;
    setLoadingAction(memberId);
    try {
      await onRoleChange(memberId, newRole);
      setEditingMember(null);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!onRemoveMember) return;
    setLoadingAction(memberId);
    try {
      await onRemoveMember(memberId);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-2">
      {sortedMembers.map((member) => (
        <GlassCard key={member.id} variant="subtle" className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center">
                <span className="font-bold text-[hsl(var(--beta-text-muted))]">
                  {(member.users?.discord_username || 'U')[0].toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div>
                <Link 
                  to={`/beta/profile/${member.user_id}`}
                  className="font-medium text-[hsl(var(--beta-text-primary))] hover:text-[hsl(var(--beta-accent))] transition-colors"
                >
                  {member.users?.discord_username || 'Unknown User'}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <BetaBadge variant="default" size="sm" style={{ color: getRankColor(member.users?.current_rank || 'Unranked') }}>
                    {member.users?.current_rank || 'Unranked'}
                  </BetaBadge>
                  {member.users?.weight_rating && (
                    <span className="text-xs text-[hsl(var(--beta-text-muted))]">
                      {member.users.weight_rating} pts
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Role & Actions */}
            <div className="flex items-center gap-2">
              {/* Role Display / Editor */}
              {editingMember === member.id && (isOwner || isManager) ? (
                <div className="relative">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as TeamMemberRole)}
                    className="appearance-none bg-[hsl(var(--beta-surface-4))] border border-[hsl(var(--beta-border))] rounded-lg px-3 py-1.5 pr-8 text-sm text-[hsl(var(--beta-text-primary))] cursor-pointer"
                    disabled={loadingAction === member.id}
                  >
                    {editableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--beta-text-muted))] pointer-events-none" />
                </div>
              ) : (
                <button
                  onClick={() => canEditMember(member) && setEditingMember(member.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                    canEditMember(member) 
                      ? 'hover:bg-[hsl(var(--beta-surface-3))] cursor-pointer' 
                      : 'cursor-default'
                  }`}
                  disabled={!canEditMember(member)}
                >
                  {roleIcons[member.role]}
                  <span className="text-[hsl(var(--beta-text-secondary))] capitalize">{member.role}</span>
                </button>
              )}

              {/* Remove Button */}
              {canRemoveMember(member) && onRemoveMember && (
                <BetaButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(member.id)}
                  disabled={loadingAction === member.id}
                  className="text-[hsl(var(--beta-error))] hover:bg-[hsl(var(--beta-error)/0.1)]"
                >
                  <UserMinus className="w-4 h-4" />
                </BetaButton>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};

export default BetaTeamRoster;
