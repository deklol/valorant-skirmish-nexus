import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserTeam } from "@/hooks/useUserTeam";
import { GradientBackground, GlassCard, BetaButton, BetaBadge, StatCard } from "@/components-beta/ui-beta";
import { 
  User, Trophy, Target, Calendar, Twitter, Clock, 
  Shield, Users, Swords, Award, Lock, ExternalLink, Edit
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getTrackerGGUrl } from "@/utils/getTrackerGGUrl";

// Role color mapping
const getRoleColor = (role: string) => {
  switch (role) {
    case 'Duelist': return 'text-red-400 bg-red-500/20 border-red-500/30';
    case 'Controller': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    case 'Initiator': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    case 'Sentinel': return 'text-green-400 bg-green-500/20 border-green-500/30';
    default: return 'text-[hsl(var(--beta-text-muted))] bg-[hsl(var(--beta-surface-4))]';
  }
};

const BetaProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  
  // Determine if viewing own profile or someone else's
  const profileId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['beta-profile', profileId],
    queryFn: async () => {
      if (!profileId) throw new Error('No user ID');
      
      // For own profile, fetch from users table directly
      // For public profile, use the RPC function
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

  // Calculate win rate
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
                  <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
                    {profile.discord_username || 'Unknown Player'}
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
                </div>

                {/* Status Message */}
                {!isPrivate && profile.status_message && (
                  <p className="text-[hsl(var(--beta-text-secondary))] italic mb-3">
                    "{profile.status_message}"
                  </p>
                )}

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {profile.current_rank && (
                    <BetaBadge variant="accent" size="md">
                      {profile.current_rank}
                    </BetaBadge>
                  )}
                  
                  {profile.peak_rank && profile.peak_rank !== profile.current_rank && (
                    <BetaBadge variant="default" size="sm">
                      Peak: {profile.peak_rank}
                    </BetaBadge>
                  )}
                  
                  {!isPrivate && profile.valorant_role && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getRoleColor(profile.valorant_role)}`}>
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

              {/* Actions / Links */}
              <div className="shrink-0 flex flex-col gap-3">
                {isOwnProfile && (
                  <Link to="/profile">
                    <BetaButton variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </BetaButton>
                  </Link>
                )}
                
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
                        <span className="w-4 h-4 font-bold">📺</span>
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

        {/* View Full Profile CTA */}
        {!isPrivate && (
          <GlassCard className="p-6 text-center">
            <p className="text-[hsl(var(--beta-text-muted))] mb-4">
              View match history, achievements, and detailed statistics
            </p>
            <Link to={isOwnProfile ? '/profile' : `/profile/${profileId}`}>
              <BetaButton variant="outline">
                View Full Profile
              </BetaButton>
            </Link>
          </GlassCard>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaProfile;
