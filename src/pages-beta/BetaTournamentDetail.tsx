import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTournamentData } from "@/hooks/useTournamentData";
import { GradientBackground, GlassCard, BetaButton, BetaBadge, StatCard } from "@/components-beta/ui-beta";
import { 
  Trophy, Users, Calendar, Clock, ArrowLeft, MapPin, 
  Shield, Swords, CheckCircle, XCircle, User
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const BetaTournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
  const {
    tournament,
    teams,
    matches,
    signups,
    loading,
    handleRefresh,
  } = useTournamentData();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'success';
      case 'live': return 'accent';
      case 'balancing': return 'warning';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const isUserSignedUp = signups?.some(s => s.user_id === user?.id);

  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading tournament...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  if (!tournament) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <GlassCard className="p-12 text-center">
            <Trophy className="w-16 h-16 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              Tournament Not Found
            </h2>
            <p className="text-[hsl(var(--beta-text-muted))] mb-6">
              This tournament doesn't exist or has been removed.
            </p>
            <Link to="/beta/tournaments">
              <BetaButton variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tournaments
              </BetaButton>
            </Link>
          </GlassCard>
        </div>
      </GradientBackground>
    );
  }

  const maxParticipants = tournament.registration_type === 'team' 
    ? tournament.max_teams || 8 
    : tournament.max_players;
  const currentParticipants = signups?.length || 0;
  const completedMatches = matches?.filter(m => m.status === 'completed').length || 0;

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Back Navigation */}
        <Link 
          to="/beta/tournaments" 
          className="inline-flex items-center gap-2 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-accent))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tournaments</span>
        </Link>

        {/* Hero Section */}
        <GlassCard variant="strong" className="p-6 md:p-8 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--beta-accent)/0.05)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <BetaBadge variant={getStatusVariant(tournament.status)} size="md">
                    {tournament.status}
                  </BetaBadge>
                  <span className="text-sm text-[hsl(var(--beta-text-muted))]">
                    {tournament.match_format}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
                  {tournament.name}
                </h1>
                {tournament.description && (
                  <p className="text-[hsl(var(--beta-text-secondary))] max-w-2xl">
                    {tournament.description}
                  </p>
                )}
              </div>

              {/* Admin Badge */}
              {isAdmin && (
                <Link to={`/tournament/${id}`}>
                  <BetaButton variant="outline" size="sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin View
                  </BetaButton>
                </Link>
              )}
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-[hsl(var(--beta-text-muted))]">
                <Calendar className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                <span>{format(new Date(tournament.start_time), "EEEE, MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 text-[hsl(var(--beta-text-muted))]">
                <Clock className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                <span>{format(new Date(tournament.start_time), "h:mm a")}</span>
              </div>
              {tournament.prize_pool && (
                <div className="flex items-center gap-2 text-[hsl(var(--beta-accent))]">
                  <Trophy className="w-4 h-4" />
                  <span className="font-medium">{tournament.prize_pool}</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Participants"
            value={`${currentParticipants}/${maxParticipants}`}
            icon={<Users />}
          />
          <StatCard
            label="Teams"
            value={teams?.length || 0}
            icon={<Shield />}
          />
          <StatCard
            label="Matches"
            value={`${completedMatches}/${matches?.length || 0}`}
            icon={<Swords />}
          />
          <StatCard
            label="Format"
            value={tournament.bracket_type || 'Single Elim'}
            icon={<Trophy />}
            valueClassName="text-base"
          />
        </div>

        {/* Registration Status */}
        {tournament.status === 'open' && (
          <GlassCard className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-1">
                  Registration {isUserSignedUp ? 'Complete' : 'Open'}
                </h3>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  {isUserSignedUp 
                    ? "You're registered for this tournament!"
                    : `${maxParticipants - currentParticipants} spots remaining`
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isUserSignedUp ? (
                  <div className="flex items-center gap-2 text-[hsl(var(--beta-success))]">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Registered</span>
                  </div>
                ) : (
                  <Link to={`/tournament/${id}`}>
                    <BetaButton>
                      Register Now
                    </BetaButton>
                  </Link>
                )}
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-[hsl(var(--beta-text-muted))] mb-1">
                <span>{currentParticipants} registered</span>
                <span>{maxParticipants} max</span>
              </div>
              <div className="w-full h-2 bg-[hsl(var(--beta-surface-4))] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))] transition-all duration-500"
                  style={{ width: `${Math.min((currentParticipants / maxParticipants) * 100, 100)}%` }}
                />
              </div>
            </div>
          </GlassCard>
        )}

        {/* Teams Section */}
        {teams && teams.length > 0 && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              Teams ({teams.length})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {teams.map((team, index) => (
                <GlassCard 
                  key={team.id} 
                  variant="subtle" 
                  hover 
                  className="p-4 beta-animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-[hsl(var(--beta-text-primary))] truncate">
                      {team.name}
                    </h4>
                    {team.seed && (
                      <span className="text-xs text-[hsl(var(--beta-accent))] font-mono">
                        #{team.seed}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--beta-text-muted))]">
                    <Users className="w-4 h-4" />
                    <span>{team.team_members?.length || 0} players</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Participants Section */}
        {signups && signups.length > 0 && tournament.registration_type !== 'team' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              Registered Players ({signups.length})
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {signups.map((signup, index) => (
                <Link 
                  key={signup.id}
                  to={`/beta/profile/${signup.user_id}`}
                  className="beta-animate-fade-in"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <GlassCard variant="subtle" hover className="p-3 text-center group">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center overflow-hidden">
                      {signup.users?.discord_avatar_url ? (
                        <img 
                          src={signup.users.discord_avatar_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-[hsl(var(--beta-text-muted))]" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))] truncate group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                      {signup.users?.discord_username || 'Unknown'}
                    </p>
                    {signup.users?.current_rank && (
                      <p className="text-xs text-[hsl(var(--beta-text-muted))] truncate">
                        {signup.users.current_rank}
                      </p>
                    )}
                  </GlassCard>
                </Link>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Matches Section */}
        {matches && matches.length > 0 && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              Matches ({matches.length})
            </h3>
            
            <div className="space-y-3">
              {matches.slice(0, 10).map((match, index) => (
                <GlassCard 
                  key={match.id} 
                  variant="subtle" 
                  className="p-4 beta-animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="text-xs text-[hsl(var(--beta-text-muted))] font-mono w-16 shrink-0">
                        Round {match.round_number}
                      </span>
                      
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-sm truncate ${
                          match.winner_id === match.team1_id 
                            ? 'text-[hsl(var(--beta-accent))] font-semibold' 
                            : 'text-[hsl(var(--beta-text-secondary))]'
                        }`}>
                          {match.team1?.name || 'TBD'}
                        </span>
                        
                        <span className="text-[hsl(var(--beta-text-muted))] shrink-0">vs</span>
                        
                        <span className={`text-sm truncate ${
                          match.winner_id === match.team2_id 
                            ? 'text-[hsl(var(--beta-accent))] font-semibold' 
                            : 'text-[hsl(var(--beta-text-secondary))]'
                        }`}>
                          {match.team2?.name || 'TBD'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {match.status === 'completed' && (
                        <span className="text-sm font-mono text-[hsl(var(--beta-text-primary))]">
                          {match.score_team1} - {match.score_team2}
                        </span>
                      )}
                      <BetaBadge 
                        variant={match.status === 'completed' ? 'success' : match.status === 'live' ? 'accent' : 'default'} 
                        size="sm"
                      >
                        {match.status}
                      </BetaBadge>
                    </div>
                  </div>
                </GlassCard>
              ))}
              
              {matches.length > 10 && (
                <p className="text-center text-sm text-[hsl(var(--beta-text-muted))] pt-2">
                  +{matches.length - 10} more matches
                </p>
              )}
            </div>
          </GlassCard>
        )}

        {/* View Full Details CTA */}
        <GlassCard className="p-6 text-center">
          <p className="text-[hsl(var(--beta-text-muted))] mb-4">
            Want to see the full bracket, manage your registration, or access admin tools?
          </p>
          <Link to={`/tournament/${id}`}>
            <BetaButton variant="outline">
              View Full Tournament Page
            </BetaButton>
          </Link>
        </GlassCard>
      </div>
    </GradientBackground>
  );
};

export default BetaTournamentDetail;
