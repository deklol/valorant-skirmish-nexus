import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { 
  ArrowLeft, Swords, Calendar, Users,
  Map, Play, CheckCircle, User, Scale, Crown
} from "lucide-react";
import { format } from "date-fns";
import { getRankIcon, getRankColor } from "@/utils/rankUtils";
import { Username } from "@/components/Username";

// Team Card with Player Details
const TeamCard = ({ 
  team, 
  score, 
  isWinner, 
  side 
}: { 
  team: any; 
  score: number | null; 
  isWinner: boolean;
  side: 'left' | 'right';
}) => {
  const { data: members } = useQuery({
    queryKey: ['beta-team-members', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const { data } = await supabase
        .from('team_members')
        .select(`
          user_id, is_captain,
          users:user_id (id, discord_username, discord_avatar_url, current_rank, weight_rating)
        `)
        .eq('team_id', team.id);
      return data || [];
    },
    enabled: !!team?.id
  });

  if (!team) {
    return (
      <GlassCard variant="subtle" className="p-6 flex-1">
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-2" />
          <p className="text-[hsl(var(--beta-text-muted))]">TBD</p>
        </div>
      </GlassCard>
    );
  }

  const teamWeight = members?.reduce((sum: number, m: any) => sum + (m.users?.weight_rating || 0), 0) || 0;
  const avgWeight = members && members.length > 0 ? Math.round(teamWeight / members.length) : 0;

  return (
    <GlassCard 
      variant={isWinner ? "strong" : "subtle"} 
      className={`p-6 flex-1 ${isWinner ? 'border-[hsl(var(--beta-accent)/0.5)] ring-1 ring-[hsl(var(--beta-accent)/0.3)]' : ''}`}
    >
      <div className={`flex flex-col ${side === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
        {/* Team Header */}
        <div className="flex items-center gap-3 mb-4">
          {isWinner && <Crown className="w-5 h-5 text-[hsl(var(--beta-accent))]" />}
          <h3 className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">{team.name}</h3>
        </div>

        {/* Score */}
        <div className="mb-4">
          <span className={`text-4xl font-bold ${isWinner ? 'text-[hsl(var(--beta-accent))]' : 'text-[hsl(var(--beta-text-primary))]'}`}>
            {score ?? 0}
          </span>
        </div>

        {/* Team Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1 text-purple-400">
            <Scale className="w-4 h-4" />
            <span>{teamWeight}</span>
          </div>
          <div className="text-[hsl(var(--beta-text-muted))]">
            Avg: {avgWeight}
          </div>
        </div>

        {/* Players */}
        <div className="w-full space-y-3">
          {members?.map((member: any) => (
            <Link key={member.user_id} to={`/beta/profile/${member.user_id}`}>
              <div className={`flex items-center gap-3 p-2 rounded-lg bg-[hsl(var(--beta-surface-3))] hover:bg-[hsl(var(--beta-surface-4))] transition-colors ${side === 'right' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-[hsl(var(--beta-surface-4))] overflow-hidden flex-shrink-0">
                  {member.users?.discord_avatar_url ? (
                    <img src={member.users.discord_avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />
                    </div>
                  )}
                </div>
                
                {/* Player Info */}
                <div className={`flex-1 min-w-0 ${side === 'right' ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-1 ${side === 'right' ? 'justify-end' : ''}`}>
                    {member.is_captain && <Crown className="w-3 h-3 text-[hsl(var(--beta-accent))]" />}
                    <Username 
                      userId={member.user_id} 
                      username={member.users?.discord_username || 'Unknown'} 
                      size="sm"
                      weight="medium"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: getRankColor(member.users?.current_rank) }}>
                      {getRankIcon(member.users?.current_rank)} {member.users?.current_rank || 'Unranked'}
                    </span>
                    <span className="text-purple-400">({member.users?.weight_rating || 0})</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

const BetaMatchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: match, isLoading, error } = useQuery({
    queryKey: ['beta-match', id],
    queryFn: async () => {
      if (!id) throw new Error('No match ID');
      
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (id, name, seed, total_rank_points),
          team2:teams!matches_team2_id_fkey (id, name, seed, total_rank_points),
          winner:teams!matches_winner_id_fkey (id, name),
          tournament:tournaments (id, name, status, match_format, enable_map_veto)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Fetch veto session if map veto is enabled
  const { data: vetoSession } = useQuery({
    queryKey: ['beta-veto-session', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('map_veto_sessions')
        .select(`*, map_veto_actions (*, maps (*))`)
        .eq('match_id', id)
        .single();
      return data;
    },
    enabled: !!id && !!match?.map_veto_enabled
  });

  const getStatusColor = (status: string): "success" | "accent" | "default" => {
    switch (status) {
      case 'completed': return 'success';
      case 'live': return 'accent';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Swords className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading match...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  if (!match || error) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <GlassCard className="p-12 text-center">
            <Swords className="w-16 h-16 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">Match Not Found</h2>
            <p className="text-[hsl(var(--beta-text-muted))] mb-6">
              {error ? `Error: ${error.message}` : "This match doesn't exist or has been removed."}
            </p>
            <BetaButton variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </BetaButton>
          </GlassCard>
        </div>
      </GradientBackground>
    );
  }

  const isWinner = (teamId: string | null) => match.winner_id === teamId;

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Back Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-accent))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Match Header */}
        <GlassCard variant="strong" className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              {match.tournament && (
                <Link 
                  to={`/beta/tournament/${match.tournament.id}`}
                  className="text-sm text-[hsl(var(--beta-accent))] hover:underline mb-1 inline-block"
                >
                  {match.tournament.name}
                </Link>
              )}
              <h1 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">
                Round {match.round_number} - Match {match.match_number}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <BetaBadge variant={getStatusColor(match.status)} size="md">
                {match.status}
              </BetaBadge>
              {match.best_of && (
                <BetaBadge variant="outline" size="md">
                  Bo{match.best_of}
                </BetaBadge>
              )}
            </div>
          </div>

          {/* Match Info */}
          <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--beta-text-muted))]">
            {match.scheduled_time && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(match.scheduled_time), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
            )}
            {match.started_at && (
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                <span>Started: {format(new Date(match.started_at), "h:mm a")}</span>
              </div>
            )}
            {match.completed_at && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Completed: {format(new Date(match.completed_at), "h:mm a")}</span>
              </div>
            )}
            {match.map_veto_enabled && (
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                <span>Map Veto Enabled</span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Score Display */}
        <div className="flex items-center justify-center gap-4 py-8">
          <div className="text-center flex-1">
            <p className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              {match.team1?.name || 'TBD'}
            </p>
            <p className={`text-6xl font-bold ${isWinner(match.team1?.id) ? 'text-[hsl(var(--beta-accent))]' : 'text-[hsl(var(--beta-text-secondary))]'}`}>
              {match.score_team1 ?? 0}
            </p>
          </div>
          
          <div className="text-3xl font-bold text-[hsl(var(--beta-text-muted))]">vs</div>
          
          <div className="text-center flex-1">
            <p className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              {match.team2?.name || 'TBD'}
            </p>
            <p className={`text-6xl font-bold ${isWinner(match.team2?.id) ? 'text-[hsl(var(--beta-accent))]' : 'text-[hsl(var(--beta-text-secondary))]'}`}>
              {match.score_team2 ?? 0}
            </p>
          </div>
        </div>

        {/* Team Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamCard 
            team={match.team1} 
            score={match.score_team1} 
            isWinner={isWinner(match.team1?.id)}
            side="left"
          />
          <TeamCard 
            team={match.team2} 
            score={match.score_team2} 
            isWinner={isWinner(match.team2?.id)}
            side="right"
          />
        </div>

        {/* Map Veto Results */}
        {vetoSession && vetoSession.status === 'completed' && (
          <GlassCard variant="subtle" className="p-6">
            <h3 className="text-lg font-bold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
              <Map className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              Map Veto Results
            </h3>
            <div className="space-y-2">
              {vetoSession.map_veto_actions?.map((action: any, idx: number) => (
                <div 
                  key={action.id} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--beta-surface-3))]"
                >
                  <span className="w-6 h-6 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center text-xs font-bold text-[hsl(var(--beta-text-muted))]">
                    {idx + 1}
                  </span>
                  <span className={`text-sm font-medium ${
                    action.action === 'ban' ? 'text-red-400' : 
                    action.action === 'pick' ? 'text-green-400' : 
                    'text-[hsl(var(--beta-text-secondary))]'
                  }`}>
                    {action.action.toUpperCase()}
                  </span>
                  <span className="text-[hsl(var(--beta-text-primary))]">
                    {action.maps?.display_name || 'Unknown Map'}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Match Notes */}
        {match.notes && (
          <GlassCard variant="subtle" className="p-6">
            <h3 className="text-lg font-bold text-[hsl(var(--beta-text-primary))] mb-2">Notes</h3>
            <p className="text-[hsl(var(--beta-text-secondary))]">{match.notes}</p>
          </GlassCard>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaMatchDetails;
