import { Link } from "react-router-dom";
import { GlassCard, BetaBadge } from "@/components-beta/ui-beta";
import { Users, Trophy, Crown, Shield, Lock } from "lucide-react";
import { PersistentTeamV2, TeamLifecycleStatus, TeamMemberRole, getRoleDisplay } from "@/types/teamV2";

interface BetaTeamCardProps {
  team: PersistentTeamV2 & {
    members?: { user_id: string; role: string; users?: { discord_username: string; current_rank: string } }[];
  };
  showStats?: boolean;
}

const getStatusVariant = (status: TeamLifecycleStatus) => {
  switch (status) {
    case 'active': return 'success';
    case 'locked': return 'warning';
    case 'disbanded': return 'error';
    case 'archived': return 'default';
    default: return 'default';
  }
};

const getStatusIcon = (status: TeamLifecycleStatus) => {
  switch (status) {
    case 'locked': return <Lock className="w-3 h-3" />;
    default: return null;
  }
};

const capitalizeStatus = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getRoleBadgeColor = (role: TeamMemberRole) => {
  switch (role) {
    case 'owner': return 'text-amber-400';
    case 'manager': return 'text-orange-400';
    case 'captain': return 'text-blue-400';
    case 'player': return 'text-gray-300';
    case 'substitute': return 'text-gray-400';
    case 'analyst': return 'text-cyan-400';
    case 'coach': return 'text-yellow-400';
    default: return 'text-gray-300';
  }
};

export const BetaTeamCard = ({ team, showStats = true }: BetaTeamCardProps) => {
  const memberCount = team.members?.length || 0;
  const winRate = team.wins && (team.wins + team.losses) > 0
    ? Math.round((team.wins / (team.wins + team.losses)) * 100)
    : 0;

  return (
    <Link to={`/beta/team/${team.id}`}>
      <GlassCard variant="interactive" hover className="h-full overflow-hidden">
        {/* Banner Header */}
        <div className="relative h-24 -mx-4 -mt-4 mb-4 overflow-hidden">
          {team.banner_image_url ? (
            <img 
              src={team.banner_image_url} 
              alt={`${team.name} banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--beta-accent)/0.3)] via-[hsl(var(--beta-surface-3))] to-[hsl(var(--beta-secondary)/0.3)]" />
          )}
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--beta-surface-2))] via-transparent to-transparent" />
          
          {/* Team icon overlay */}
          <div className="absolute bottom-2 left-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))] flex items-center justify-center shadow-lg border-2 border-[hsl(var(--beta-surface-2))]">
              <Shield className="w-6 h-6 text-[hsl(var(--beta-surface-1))]" />
            </div>
          </div>
          
          {/* Status badge overlay */}
          <div className="absolute top-2 right-2">
            <BetaBadge variant={getStatusVariant(team.status)} size="sm">
              {getStatusIcon(team.status)}
              <span className={getStatusIcon(team.status) ? "ml-1" : ""}>{capitalizeStatus(team.status)}</span>
            </BetaBadge>
          </div>
        </div>

        {/* Team Name */}
        <div className="mb-3">
          <h3 className="font-bold text-[hsl(var(--beta-text-primary))] text-lg">{team.name}</h3>
        </div>

        {/* Stats */}
        {showStats && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
              <Users className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--beta-text-muted))]" />
              <p className="text-sm font-bold text-[hsl(var(--beta-text-primary))]">{memberCount}</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">Members</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
              <Trophy className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--beta-accent))]" />
              <p className="text-sm font-bold text-[hsl(var(--beta-text-primary))]">{team.tournaments_won || 0}</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">Wins</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
              <Crown className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--beta-secondary))]" />
              <p className="text-sm font-bold text-[hsl(var(--beta-text-primary))]">{winRate}%</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">Win Rate</p>
            </div>
          </div>
        )}

        {/* Members List */}
        {team.members && team.members.length > 0 && (
          <div className="pt-3 border-t border-[hsl(var(--beta-border))]">
            <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-2 font-medium">Team Roster</p>
            <div className="flex flex-col gap-1.5">
              {team.members.slice(0, 6).map((member) => {
                const role = member.role as TeamMemberRole;
                const roleDisplay = getRoleDisplay(role);
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[hsl(var(--beta-text-secondary))] truncate">
                        {member.users?.discord_username || 'Unknown'}
                      </span>
                      {member.users?.current_rank && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-muted))] shrink-0">
                          {member.users.current_rank}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${getRoleBadgeColor(role)}`}>
                      {roleDisplay.label}
                    </span>
                  </div>
                );
              })}
              {team.members.length > 6 && (
                <p className="text-xs text-[hsl(var(--beta-text-muted))] text-center mt-1">
                  +{team.members.length - 6} more
                </p>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    </Link>
  );
};

export default BetaTeamCard;
