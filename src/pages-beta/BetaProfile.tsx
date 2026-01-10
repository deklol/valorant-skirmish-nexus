import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserTeam } from "@/hooks/useUserTeam";
import { GradientBackground, GlassCard, BetaButton, BetaBadge, StatCard } from "@/components-beta/ui-beta";
import { 
  User, Trophy, Target, Calendar, Twitter, Clock, 
  Shield, Users, Swords, Award, Lock, ExternalLink, Edit,
  TrendingUp, Medal, History, Gamepad2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { getTrackerGGUrl } from "@/utils/getTrackerGGUrl";
import { useState } from "react";
import { getRankIcon, getRankColor } from "@/utils/rankUtils";
import { Username } from "@/components/Username";
import FaceitStatsDisplay from "@/components/profile/FaceitStatsDisplay";
import { FaceitRankIcon, getRankConfig } from "@/components/profile/FaceitRankIcon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Role color mapping
const getRoleColorClass = (role: string) => {
  switch (role) {
    case 'Duelist': return 'text-red-400 bg-red-500/20 border-red-500/30';
    case 'Controller': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    case 'Initiator': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    case 'Sentinel': return 'text-green-400 bg-green-500/20 border-green-500/30';
    default: return 'text-[hsl(var(--beta-text-muted))] bg-[hsl(var(--beta-surface-4))]';
  }
};

// Beta Tabs Component
const BetaProfileTabs = ({ 
  tabs, 
  activeTab, 
  onTabChange 
}: { 
  tabs: { id: string; label: string; icon: React.ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) => (
  <div className="flex flex-wrap gap-2 p-1 bg-[hsl(var(--beta-surface-2))] rounded-xl border border-[hsl(var(--beta-border))]">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === tab.id
            ? 'bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))]'
            : 'text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))]'
        }`}
      >
        {tab.icon}
        <span className="hidden sm:inline">{tab.label}</span>
      </button>
    ))}
  </div>
);

// Match History Tab
const MatchHistoryTab = ({ userId }: { userId: string }) => {
  const { data: matches, isLoading } = useQuery({
    queryKey: ['beta-match-history', userId],
    queryFn: async () => {
      // Get teams the user is a member of
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);
      
      if (!teamMemberships || teamMemberships.length === 0) return [];
      
      const teamIds = teamMemberships.map(tm => tm.team_id);
      
      // Get matches for those teams
      const { data } = await supabase
        .from('matches')
        .select(`
          id, status, score_team1, score_team2, completed_at, round_number,
          team1:teams!matches_team1_id_fkey (id, name),
          team2:teams!matches_team2_id_fkey (id, name),
          winner:teams!matches_winner_id_fkey (id, name),
          tournament:tournaments (id, name)
        `)
        .or(teamIds.map(id => `team1_id.eq.${id},team2_id.eq.${id}`).join(','))
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);
      
      return data || [];
    }
  });

  if (isLoading) return <div className="text-[hsl(var(--beta-text-muted))] text-center py-8">Loading matches...</div>;

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Swords className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
        <p className="text-[hsl(var(--beta-text-muted))]">No match history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match: any, idx: number) => (
        <Link key={match.id} to={`/beta/match/${match.id}`}>
          <GlassCard 
            variant="subtle" 
            hover 
            className="p-4 beta-animate-fade-in"
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-1">
                  {match.tournament?.name} • Round {match.round_number}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[hsl(var(--beta-text-primary))] font-medium">{match.team1?.name}</span>
                  <span className="text-[hsl(var(--beta-text-muted))]">vs</span>
                  <span className="text-[hsl(var(--beta-text-primary))] font-medium">{match.team2?.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">
                  {match.score_team1} - {match.score_team2}
                </div>
                {match.completed_at && (
                  <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                    {format(new Date(match.completed_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        </Link>
      ))}
    </div>
  );
};

// Tournament History Tab
const TournamentHistoryTab = ({ userId }: { userId: string }) => {
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['beta-tournament-history', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tournament_signups')
        .select(`
          id,
          tournament:tournaments (
            id, name, status, start_time,
            teams (id, name, status)
          )
        `)
        .eq('user_id', userId)
        .order('signed_up_at', { ascending: false })
        .limit(20);
      
      return data || [];
    }
  });

  if (isLoading) return <div className="text-[hsl(var(--beta-text-muted))] text-center py-8">Loading tournaments...</div>;

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
        <p className="text-[hsl(var(--beta-text-muted))]">No tournament history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tournaments.map((signup: any, idx: number) => (
        <Link key={signup.id} to={`/beta/tournament/${signup.tournament?.id}`}>
          <GlassCard 
            variant="subtle" 
            hover 
            className="p-4 beta-animate-fade-in"
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[hsl(var(--beta-text-primary))] font-medium">{signup.tournament?.name}</p>
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                  {signup.tournament?.start_time && format(new Date(signup.tournament.start_time), 'MMM d, yyyy')}
                </p>
              </div>
              <BetaBadge 
                variant={signup.tournament?.status === 'completed' ? 'success' : 'default'}
                size="sm"
              >
                {signup.tournament?.status}
              </BetaBadge>
            </div>
          </GlassCard>
        </Link>
      ))}
    </div>
  );
};

// Achievements Tab
const AchievementsTab = ({ userId }: { userId: string }) => {
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['beta-achievements', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_achievements')
        .select(`
          id, unlocked_at,
          achievement:achievements (id, name, description, icon, points, rarity)
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });
      
      return data || [];
    }
  });

  if (isLoading) return <div className="text-[hsl(var(--beta-text-muted))] text-center py-8">Loading achievements...</div>;

  if (!achievements || achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
        <p className="text-[hsl(var(--beta-text-muted))]">No achievements unlocked yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {achievements.map((ua: any, idx: number) => (
        <GlassCard 
          key={ua.id} 
          variant="subtle" 
          className="p-4 beta-animate-fade-in"
          style={{ animationDelay: `${idx * 30}ms` }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--beta-accent)/0.2)] flex items-center justify-center text-2xl">
              {ua.achievement?.icon || '🏆'}
            </div>
            <div className="flex-1">
              <p className="text-[hsl(var(--beta-text-primary))] font-medium">{ua.achievement?.name}</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">{ua.achievement?.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <BetaBadge variant="accent" size="sm">{ua.achievement?.points} pts</BetaBadge>
                <span className="text-xs text-[hsl(var(--beta-text-muted))]">{ua.achievement?.rarity}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};

// Rank History Tab
const RankHistoryTab = ({ userId }: { userId: string }) => {
  const { data: rankHistory, isLoading } = useQuery({
    queryKey: ['beta-rank-history', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('rank_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      return data || [];
    }
  });

  if (isLoading) return <div className="text-[hsl(var(--beta-text-muted))] text-center py-8">Loading rank history...</div>;

  if (!rankHistory || rankHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
        <p className="text-[hsl(var(--beta-text-muted))]">No rank history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rankHistory.map((entry: any, idx: number) => (
        <GlassCard 
          key={entry.id} 
          variant="subtle" 
          className="p-4 beta-animate-fade-in"
          style={{ animationDelay: `${idx * 30}ms` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {entry.previous_rank && (
                <>
                  <span style={{ color: getRankColor(entry.previous_rank) }}>
                    {getRankIcon(entry.previous_rank)} {entry.previous_rank}
                  </span>
                  <span className="text-[hsl(var(--beta-text-muted))]">→</span>
                </>
              )}
              <span style={{ color: getRankColor(entry.new_rank) }}>
                {getRankIcon(entry.new_rank)} {entry.new_rank}
              </span>
            </div>
            <div className="text-right">
              {entry.rank_points_change && (
                <span className={`text-sm font-medium ${entry.rank_points_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.rank_points_change > 0 ? '+' : ''}{entry.rank_points_change} RR
                </span>
              )}
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                {format(new Date(entry.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};

const BetaProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Determine if viewing own profile or someone else's
  const profileId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['beta-profile', profileId],
    queryFn: async () => {
      if (!profileId) throw new Error('No user ID');
      
      if (isOwnProfile && user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', profileId)
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.rpc('get_user_profile', {
          profile_user_id: profileId
        });
        
        if (error) throw error;
        return data?.[0] || null;
      }
    },
    enabled: !!profileId
  });

  const { userTeam } = useUserTeam(profileId);

  // Fetch FACEIT stats for badge display
  const { data: faceitStats } = useQuery({
    queryKey: ['faceit-stats-badge', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faceit_stats')
        .select('cs2_skill_level, cs2_elo, faceit_nickname')
        .eq('user_id', profileId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
  const calculateWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <User className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading profile...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  if (!profile) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <GlassCard className="p-12 text-center">
            <User className="w-16 h-16 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              Profile Not Found
            </h2>
            <p className="text-[hsl(var(--beta-text-muted))] mb-6">
              This user profile doesn't exist or has been made private.
            </p>
            <Link to="/beta/players">
              <BetaButton variant="outline">
                Browse Players
              </BetaButton>
            </Link>
          </GlassCard>
        </div>
      </GradientBackground>
    );
  }

  const isPrivate = profile.profile_visibility === 'private' && !isOwnProfile;
  const winRate = calculateWinRate(profile.wins || 0, profile.losses || 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'tournaments', label: 'Tournaments', icon: <Trophy className="w-4 h-4" /> },
    { id: 'achievements', label: 'Achievements', icon: <Award className="w-4 h-4" /> },
    { id: 'rank-history', label: 'Rank History', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Header Card */}
        <GlassCard variant="strong" className="p-6 md:p-8 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--beta-accent)/0.05)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-[hsl(var(--beta-surface-4))] overflow-hidden ring-2 ring-[hsl(var(--beta-border-accent))] ring-offset-2 ring-offset-[hsl(var(--beta-surface-1))]">
                  {profile.discord_avatar_url ? (
                    <img 
                      src={profile.discord_avatar_url} 
                      alt={profile.discord_username || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-[hsl(var(--beta-text-muted))]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    <Username 
                      userId={profileId}
                      username={profile.discord_username || 'Unknown Player'}
                      size="xl"
                      weight="bold"
                    />
                  </h1>
                  
                  {profile.role === 'admin' && (
                    <BetaBadge variant="accent" size="sm">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </BetaBadge>
                  )}
                  
                  {isPrivate && (
                    <Lock className="w-5 h-5 text-[hsl(var(--beta-text-muted))]" />
                  )}

                  {isOwnProfile && (
                    <Link to="/beta/settings">
                      <BetaButton variant="outline" size="sm">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit Profile
                      </BetaButton>
                    </Link>
                  )}
                </div>

                {/* Status Message */}
                {!isPrivate && profile.status_message && (
                  <p className="text-[hsl(var(--beta-text-secondary))] italic mb-3">
                    "{profile.status_message}"
                  </p>
                )}

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {/* FACEIT Level Badge - First */}
                  {!isPrivate && faceitStats?.cs2_skill_level && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-pointer">
                            <FaceitRankIcon 
                              level={faceitStats.cs2_skill_level} 
                              size="sm-md" 
                              showGlow={false}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="bottom" 
                          className="bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))]"
                        >
                          <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">
                            CS2 FACEIT Level {faceitStats.cs2_skill_level}
                          </p>
                          <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                            {faceitStats.cs2_elo} ELO
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {profile.current_rank && (
                    <BetaBadge variant="accent" size="md">
                      {getRankIcon(profile.current_rank)} {profile.current_rank}
                    </BetaBadge>
                  )}
                  
                  {profile.peak_rank && profile.peak_rank !== profile.current_rank && (
                    <BetaBadge variant="default" size="sm">
                      Peak: {profile.peak_rank}
                    </BetaBadge>
                  )}
                  
                  {!isPrivate && profile.valorant_role && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getRoleColorClass(profile.valorant_role)}`}>
                      {profile.valorant_role}
                    </span>
                  )}
                  
                  {profile.looking_for_team && (
                    <BetaBadge variant="success" size="sm">
                      <Users className="w-3 h-3 mr-1" />
                      LFT
                    </BetaBadge>
                  )}
                </div>

                {/* Quick Info */}
                <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--beta-text-muted))]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</span>
                  </div>
                  {profile.last_seen && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Active {formatDistanceToNow(new Date(profile.last_seen), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Links */}
              <div className="shrink-0 flex flex-col gap-3">
                {!isPrivate && (
                  <div className="flex flex-col gap-2">
                    {profile.twitter_handle && (
                      <a 
                        href={`https://twitter.com/${profile.twitter_handle.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-accent))] transition-colors"
                      >
                        <Twitter className="w-4 h-4" />
                        <span>Twitter</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {profile.twitch_handle && (
                      <a 
                        href={`https://twitch.tv/${profile.twitch_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[hsl(var(--beta-text-muted))] hover:text-purple-400 transition-colors"
                      >
                        <Gamepad2 className="w-4 h-4" />
                        <span>Twitch</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {profile.riot_id && (
                      <a 
                        href={getTrackerGGUrl(profile.riot_id) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[hsl(var(--beta-text-muted))] hover:text-red-400 transition-colors"
                      >
                        <Target className="w-4 h-4" />
                        <span>Tracker.gg</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {!isPrivate && profile.bio && (
              <div className="mt-6 pt-6 border-t border-[hsl(var(--beta-border))]">
                <h3 className="text-sm font-medium text-[hsl(var(--beta-text-muted))] mb-2">About</h3>
                <p className="text-[hsl(var(--beta-text-secondary))]">{profile.bio}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Stats Grid */}
        {!isPrivate && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Match Wins"
              value={profile.wins || 0}
              icon={<Swords />}
              trend={winRate > 50 ? 'up' : winRate < 50 ? 'down' : 'neutral'}
              trendValue={`${winRate}% WR`}
            />
            <StatCard
              label="Match Losses"
              value={profile.losses || 0}
              icon={<Target />}
            />
            <StatCard
              label="Tournaments"
              value={profile.tournaments_played || 0}
              icon={<Calendar />}
            />
            <StatCard
              label="Tournament Wins"
              value={profile.tournaments_won || 0}
              icon={<Trophy />}
              trend={profile.tournaments_won > 0 ? 'up' : undefined}
            />
          </div>
        )}

        {/* Team Section */}
        {!isPrivate && userTeam && (
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              Current Team
            </h3>
            
            <GlassCard variant="subtle" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-[hsl(var(--beta-text-primary))]">
                    {userTeam.name}
                  </h4>
                  {userTeam.description && (
                    <p className="text-sm text-[hsl(var(--beta-text-muted))] mt-1">
                      {userTeam.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-[hsl(var(--beta-text-muted))]">
                    <span>{userTeam.member_count}/{userTeam.max_members} members</span>
                    {userTeam.is_user_captain && (
                      <BetaBadge variant="accent" size="sm">Captain</BetaBadge>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-[hsl(var(--beta-text-muted))]">Team Record</p>
                  <p className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
                    <span className="text-green-400">{userTeam.wins || 0}W</span>
                    {' - '}
                    <span className="text-red-400">{userTeam.losses || 0}L</span>
                  </p>
                </div>
              </div>
            </GlassCard>
          </GlassCard>
        )}

        {/* Private Profile Notice */}
        {isPrivate && (
          <GlassCard className="p-12 text-center">
            <Lock className="w-16 h-16 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              Private Profile
            </h3>
            <p className="text-[hsl(var(--beta-text-muted))]">
              This user has made their profile private. Some information may be hidden.
            </p>
          </GlassCard>
        )}

        {/* Tabs for additional content */}
        {!isPrivate && profileId && (
          <>
            <BetaProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            
            <GlassCard className="p-6">
              {activeTab === 'overview' && (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">Profile Overview</h3>
                  <p className="text-[hsl(var(--beta-text-muted))]">
                    Use the tabs above to view match history, tournaments, achievements, and rank history.
                  </p>
                </div>
              )}
              
              {activeTab === 'matches' && <MatchHistoryTab userId={profileId} />}
              {activeTab === 'tournaments' && <TournamentHistoryTab userId={profileId} />}
              {activeTab === 'achievements' && <AchievementsTab userId={profileId} />}
              {activeTab === 'rank-history' && <RankHistoryTab userId={profileId} />}
            </GlassCard>
          </>
        )}

        {/* FACEIT CS2 Stats */}
        {!isPrivate && profileId && (
          <FaceitStatsDisplay userId={profileId} />
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaProfile;
