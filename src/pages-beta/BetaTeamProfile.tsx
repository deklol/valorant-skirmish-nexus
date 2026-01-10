import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { BetaTeamRoster, BetaTeamStats } from "@/components-beta/team";
import { 
  Shield, ArrowLeft, Trophy, Users, Calendar, Clock, 
  Crown, Lock, ExternalLink, Swords 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PersistentTeamV2, PersistentTeamMemberV2, TeamLifecycleStatus } from "@/types/teamV2";

const BetaTeamProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<PersistentTeamV2 | null>(null);
  const [members, setMembers] = useState<PersistentTeamMemberV2[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTeamData();
    }
  }, [id]);

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

      setTeam({
        ...teamData,
        status: (teamData.status || 'active') as TeamLifecycleStatus,
      } as PersistentTeamV2);

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

      setMembers((membersData || []).map(m => ({
        ...m,
        role: m.role || 'player',
      })) as PersistentTeamMemberV2[]);

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
            <Link to="/beta/teams">
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

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <Link to="/beta/teams" className="inline-flex items-center gap-2 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>

        {/* Header */}
        <GlassCard variant="strong" className="p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Team Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))] flex items-center justify-center">
              <Shield className="w-12 h-12 text-[hsl(var(--beta-surface-1))]" />
            </div>

            {/* Team Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))]">{team.name}</h1>
                <BetaBadge variant={getStatusVariant(team.status)}>
                  {team.status === 'locked' && <Lock className="w-3 h-3 mr-1" />}
                  {team.status}
                </BetaBadge>
              </div>
              
              {team.description && (
                <p className="text-[hsl(var(--beta-text-secondary))] mb-4">{team.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-[hsl(var(--beta-text-muted))]">
                <div className="flex items-center gap-1">
                  <Crown className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                  <span>Owner: </span>
                  {owner ? (
                    <Link to={`/beta/profile/${owner.user_id}`} className="text-[hsl(var(--beta-accent))] hover:underline">
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
        </GlassCard>

        {/* Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-4">Team Statistics</h2>
          <BetaTeamStats team={team} memberCount={members.length} />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Roster - 2 cols */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              Team Roster
            </h2>
            <BetaTeamRoster members={members} />
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
                  <Link key={reg.id} to={`/beta/tournament/${reg.tournaments?.id}`}>
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
    </GradientBackground>
  );
};

export default BetaTeamProfile;
