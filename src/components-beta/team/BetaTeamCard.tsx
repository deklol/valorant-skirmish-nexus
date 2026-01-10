import { Link } from "react-router-dom";
import { GlassCard, BetaBadge } from "@/components-beta/ui-beta";
import { Users, Trophy, Crown, Shield, Lock } from "lucide-react";
import { PersistentTeamV2, TeamLifecycleStatus } from "@/types/teamV2";

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

export const BetaTeamCard = ({ team, showStats = true }: BetaTeamCardProps) => {
  const memberCount = team.members?.length || 0;
  const winRate = team.wins && (team.wins + team.losses) > 0
    ? Math.round((team.wins / (team.wins + team.losses)) * 100)
    : 0;

  return (
    <Link to={`/beta/team/${team.id}`}>
      <GlassCard variant="interactive" hover className="h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))] flex items-center justify-center">
              <Shield className="w-6 h-6 text-[hsl(var(--beta-surface-1))]" />
            </div>
            <div>
              <h3 className="font-bold text-[hsl(var(--beta-text-primary))] text-lg">{team.name}</h3>
              <div className="flex items-center gap-2">
                <BetaBadge variant={getStatusVariant(team.status)} size="sm">
                  {getStatusIcon(team.status)}
                  <span className="ml-1">{team.status}</span>
                </BetaBadge>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {team.description && (
          <p className="text-[hsl(var(--beta-text-muted))] text-sm mb-4 line-clamp-2">
            {team.description}
          </p>
        )}

        {/* Stats */}
        {showStats && (
          <div className="grid grid-cols-3 gap-3 mb-4">
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

        {/* Members Preview */}
        {team.members && team.members.length > 0 && (
          <div className="pt-3 border-t border-[hsl(var(--beta-border))]">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {team.members.slice(0, 5).map((member, idx) => (
                  <div
                    key={member.user_id}
                    className="w-7 h-7 rounded-full bg-[hsl(var(--beta-surface-4))] border-2 border-[hsl(var(--beta-surface-2))] flex items-center justify-center text-xs font-medium text-[hsl(var(--beta-text-muted))]"
                    title={member.users?.discord_username || 'Unknown'}
                  >
                    {(member.users?.discord_username || 'U')[0].toUpperCase()}
                  </div>
                ))}
                {team.members.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-[hsl(var(--beta-accent-subtle))] border-2 border-[hsl(var(--beta-surface-2))] flex items-center justify-center text-xs font-medium text-[hsl(var(--beta-accent))]">
                    +{team.members.length - 5}
                  </div>
                )}
              </div>
              <span className="text-xs text-[hsl(var(--beta-text-muted))]">
                {team.avg_rank_points ? `Avg ${Math.round(team.avg_rank_points)} pts` : ''}
              </span>
            </div>
          </div>
        )}
      </GlassCard>
    </Link>
  );
};

export default BetaTeamCard;
