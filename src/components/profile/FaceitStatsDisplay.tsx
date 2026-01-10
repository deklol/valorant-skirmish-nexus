/**
 * FACEIT CS2 Stats Display Component
 * Shows FACEIT stats on user profiles
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard, BetaBadge } from "@/components-beta/ui-beta";
import { 
  Gamepad2, Trophy, Target, TrendingUp, Skull, 
  Clock, Shield, Award, Users, ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FaceitStatsDisplayProps {
  userId: string;
  showCompact?: boolean;
}

// FACEIT skill level colors
const getSkillLevelColor = (level: number): string => {
  const colors: Record<number, string> = {
    1: '#EE4B2B',
    2: '#EE4B2B', 
    3: '#FF8C00',
    4: '#FFD700',
    5: '#FFD700',
    6: '#32CD32',
    7: '#32CD32',
    8: '#00CED1',
    9: '#8A2BE2',
    10: '#FF1493',
  };
  return colors[level] || '#888';
};

const FaceitStatsDisplay = ({ userId, showCompact = false }: FaceitStatsDisplayProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['faceit-stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faceit_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-[hsl(var(--beta-surface-4))] rounded-lg" />
          <div className="h-4 bg-[hsl(var(--beta-surface-4))] rounded w-32" />
        </div>
      </GlassCard>
    );
  }

  if (!stats) {
    return null; // Don't show anything if no FACEIT stats
  }

  const skillLevelColor = getSkillLevelColor(stats.cs2_skill_level || 1);
  const last30WinRate = stats.last30_wins && stats.last30_losses 
    ? Math.round((stats.last30_wins / (stats.last30_wins + stats.last30_losses)) * 100)
    : null;

  if (showCompact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))]">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg text-white"
          style={{ backgroundColor: skillLevelColor }}
        >
          {stats.cs2_skill_level || '?'}
        </div>
        <div>
          <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">
            FACEIT Level {stats.cs2_skill_level}
          </p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">
            {stats.cs2_elo} ELO • {stats.faceit_nickname}
          </p>
        </div>
      </div>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">FACEIT CS2 Stats</h3>
          {stats.faceit_verified && (
            <BetaBadge variant="success" size="sm">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </BetaBadge>
          )}
        </div>
        <a 
          href={`https://www.faceit.com/en/players/${stats.faceit_nickname}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[hsl(var(--beta-accent))] hover:underline text-sm flex items-center gap-1"
        >
          View on FACEIT
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-[hsl(var(--beta-surface-3))]">
        {stats.faceit_avatar && (
          <img 
            src={stats.faceit_avatar} 
            alt={stats.faceit_nickname || 'FACEIT'} 
            className="w-16 h-16 rounded-xl object-cover"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">
              {stats.faceit_nickname}
            </p>
            {stats.faceit_country && (
              <span className="text-sm text-[hsl(var(--beta-text-muted))]">
                ({stats.faceit_country})
              </span>
            )}
          </div>
          <p className="text-sm text-[hsl(var(--beta-text-muted))]">
            {stats.cs2_region} • {stats.cs2_game_player_name}
          </p>
        </div>
        
        {/* Skill Level Badge */}
        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl text-white shadow-lg"
            style={{ backgroundColor: skillLevelColor }}
          >
            {stats.cs2_skill_level || '?'}
          </div>
          <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">Level</p>
        </div>
        
        {/* ELO */}
        <div className="text-center">
          <p className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">
            {stats.cs2_elo?.toLocaleString()}
          </p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">ELO</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
          <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
          <p className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">
            {stats.lifetime_matches || 0}
          </p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">Matches</p>
        </div>
        
        <div className="p-4 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
          <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <p className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">
            {stats.lifetime_win_rate || 0}%
          </p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">Win Rate</p>
        </div>
        
        <div className="p-4 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
          <Target className="w-5 h-5 text-red-500 mx-auto mb-2" />
          <p className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">
            {stats.lifetime_avg_kd || 0}
          </p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">Avg K/D</p>
        </div>
        
        <div className="p-4 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
          <Skull className="w-5 h-5 text-purple-500 mx-auto mb-2" />
          <p className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">
            {stats.lifetime_avg_headshots_pct || 0}%
          </p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">HS %</p>
        </div>
      </div>

      {/* Last 30 Days Section */}
      {stats.last30_wins !== null && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Last 30 Days
          </h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-2))] text-center">
              <p className="font-bold text-[hsl(var(--beta-text-primary))]">{stats.last30_wins}-{stats.last30_losses}</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">W-L</p>
            </div>
            <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-2))] text-center">
              <p className="font-bold text-[hsl(var(--beta-text-primary))]">{last30WinRate}%</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">Win Rate</p>
            </div>
            <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-2))] text-center">
              <p className="font-bold text-[hsl(var(--beta-text-primary))]">{stats.last30_kd_ratio}</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">K/D</p>
            </div>
            <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-2))] text-center">
              <p className="font-bold text-[hsl(var(--beta-text-primary))]">{stats.last30_adr}</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">ADR</p>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {stats.lifetime_adr && (
          <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-2))]">
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">Lifetime ADR</p>
            <p className="font-bold text-[hsl(var(--beta-text-primary))]">{stats.lifetime_adr}</p>
          </div>
        )}
        {stats.lifetime_longest_win_streak && (
          <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-2))]">
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">Best Win Streak</p>
            <p className="font-bold text-[hsl(var(--beta-text-primary))]">{stats.lifetime_longest_win_streak}</p>
          </div>
        )}
        {stats.steam_playtime_hours && (
          <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-2))]">
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">CS2 Playtime</p>
            <p className="font-bold text-[hsl(var(--beta-text-primary))]">
              {Math.round(stats.steam_playtime_hours)}h
            </p>
          </div>
        )}
      </div>

      {/* Steam Status */}
      {(stats.steam_vac_banned || stats.steam_game_banned) && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {stats.steam_vac_banned && "VAC Banned"}
            {stats.steam_vac_banned && stats.steam_game_banned && " • "}
            {stats.steam_game_banned && "Game Banned"}
          </p>
        </div>
      )}

      {/* Last Updated */}
      <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-4">
        Last updated {formatDistanceToNow(new Date(stats.last_fetched_at), { addSuffix: true })}
      </p>
    </GlassCard>
  );
};

export default FaceitStatsDisplay;
