import { GlassCard } from "@/components-beta/ui-beta";
import { Trophy, Target, Swords, Users, TrendingUp, Medal } from "lucide-react";
import { PersistentTeamV2 } from "@/types/teamV2";

interface BetaTeamStatsProps {
  team: PersistentTeamV2;
  memberCount?: number;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
  delay?: number;
}

const StatItem = ({ icon, label, value, accent = false, delay = 0 }: StatItemProps) => (
  <GlassCard
    hover
    className="p-4 beta-animate-fade-in"
    style={{ animationDelay: `${delay}ms` } as React.CSSProperties}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${accent ? 'bg-[hsl(var(--beta-accent-subtle))]' : 'bg-[hsl(var(--beta-surface-4))]'}`}>
        <div className={accent ? 'text-[hsl(var(--beta-accent))]' : 'text-[hsl(var(--beta-text-muted))]'}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">{value}</p>
        <p className="text-xs text-[hsl(var(--beta-text-muted))]">{label}</p>
      </div>
    </div>
  </GlassCard>
);

export const BetaTeamStats = ({ team, memberCount = 0 }: BetaTeamStatsProps) => {
  const totalGames = (team.wins || 0) + (team.losses || 0);
  const winRate = totalGames > 0 ? Math.round((team.wins || 0) / totalGames * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatItem icon={<Users className="w-5 h-5" />} label="Members" value={memberCount} delay={0} />
      <StatItem icon={<Trophy className="w-5 h-5" />} label="Tournaments Won" value={team.tournaments_won || 0} accent delay={50} />
      <StatItem icon={<Swords className="w-5 h-5" />} label="Tournaments Played" value={team.tournaments_played || 0} delay={100} />
      <StatItem icon={<Target className="w-5 h-5" />} label="Win Rate" value={`${winRate}%`} delay={150} />
      <StatItem icon={<TrendingUp className="w-5 h-5" />} label="Avg Weight" value={Math.round(team.avg_rank_points || 0)} delay={200} />
      <StatItem icon={<Medal className="w-5 h-5" />} label="Total Weight" value={team.total_rank_points || 0} delay={250} />
    </div>
  );
};

export default BetaTeamStats;
