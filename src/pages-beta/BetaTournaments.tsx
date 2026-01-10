import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, Trophy, Users, Calendar, Gamepad2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GradientBackground, GlassCard, BetaButton, BetaInput, BetaBadge } from "@/components-beta/ui-beta";
import { format } from "date-fns";

interface DisplayTournament {
  id: string;
  name: string;
  status: string;
  start_time: string;
  match_format: string;
  max_players: number;
  max_teams: number;
  registration_type: "solo" | "team";
  currentSignups: number;
  prize_pool: string | null;
  banner_image_url: string | null;
}

const BetaTournaments = () => {
  const [tournaments, setTournaments] = useState<DisplayTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const tournamentsWithSignups = await Promise.all(
        (tournamentsData || []).map(async (tournament) => {
          let signupCount = 0;
          
          if (tournament.registration_type === 'team') {
            const { count } = await supabase
              .from('team_tournament_registrations')
              .select('*', { count: 'exact' })
              .eq('tournament_id', tournament.id)
              .eq('status', 'registered');
            signupCount = count || 0;
          } else {
            const { count } = await supabase
              .from('tournament_signups')
              .select('*', { count: 'exact' })
              .eq('tournament_id', tournament.id);
            signupCount = count || 0;
          }

          return {
            id: tournament.id,
            name: tournament.name,
            status: tournament.status,
            start_time: tournament.start_time,
            match_format: tournament.match_format,
            max_players: tournament.max_players,
            max_teams: tournament.max_teams || 0,
            registration_type: tournament.registration_type as "solo" | "team",
            currentSignups: signupCount,
            prize_pool: tournament.prize_pool,
            banner_image_url: tournament.banner_image_url,
          };
        })
      );

      setTournaments(tournamentsWithSignups);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = tournaments
    .filter(tournament => {
      const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || tournament.status === statusFilter;
      const isArchived = tournament.status === "archived";
      const showArchived = statusFilter === "archived";
      return matchesSearch && matchesStatus && (!isArchived || showArchived);
    })
    .sort((a, b) => {
      const priorityStatuses = ['open', 'live', 'balancing'];
      const aPriority = priorityStatuses.includes(a.status);
      const bPriority = priorityStatuses.includes(b.status);
      
      if (aPriority && bPriority) {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }
      if (!aPriority && !bPriority) {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      }
      return aPriority ? -1 : 1;
    });

  const getStatusVariant = (status: string): 'success' | 'accent' | 'warning' | 'default' | 'error' => {
    switch (status) {
      case 'open': return 'success';
      case 'live': return 'accent';
      case 'balancing': return 'warning';
      case 'completed': return 'default';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatMatchFormat = (format: string) => {
    if (!format) return 'Standard';
    return format.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getMaxParticipants = (tournament: DisplayTournament) => {
    return tournament.registration_type === 'team' ? tournament.max_teams : tournament.max_players;
  };

  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading tournaments...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              Tournaments
            </h1>
            <p className="text-[hsl(var(--beta-text-secondary))]">
              Browse and join upcoming competitive events
            </p>
          </div>
          
          {isAdmin && (
            <Link to="/beta/admin">
              <BetaButton>
                <Plus className="w-4 h-4 mr-2" />
                Create Tournament
              </BetaButton>
            </Link>
          )}
        </div>

        {/* Filters */}
        <GlassCard className="mb-8 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />
            <span className="text-sm font-medium text-[hsl(var(--beta-text-secondary))]">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--beta-text-muted))]" />
              <BetaInput
                placeholder="Search tournaments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-[var(--beta-radius-md)] px-3 bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-primary))] border border-[hsl(var(--beta-glass-border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="balancing">Balancing</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </GlassCard>

        {/* Tournament Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament, index) => (
            <Link 
              key={tournament.id} 
              to={`/beta/tournament/${tournament.id}`}
              className="beta-animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <GlassCard hover className="p-0 h-full group overflow-hidden">
                {/* Banner Image */}
                {tournament.banner_image_url ? (
                  <div className="relative h-36 overflow-hidden">
                    <img 
                      src={tournament.banner_image_url} 
                      alt={tournament.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--beta-surface-1))] via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      <BetaBadge variant={getStatusVariant(tournament.status)} size="sm">
                        {formatStatus(tournament.status)}
                      </BetaBadge>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-24 bg-gradient-to-br from-[hsl(var(--beta-accent)/0.2)] via-[hsl(var(--beta-surface-3))] to-[hsl(var(--beta-secondary)/0.2)] overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Trophy className="w-10 h-10 text-[hsl(var(--beta-text-muted)/0.3)]" />
                    </div>
                    <div className="absolute top-3 right-3">
                      <BetaBadge variant={getStatusVariant(tournament.status)} size="sm">
                        {formatStatus(tournament.status)}
                      </BetaBadge>
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-5">
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors line-clamp-2 mb-3">
                    {tournament.name}
                  </h3>

                  {/* Registration type badge */}
                  <div className="mb-4">
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: tournament.registration_type === 'team' 
                        ? 'hsl(var(--beta-accent) / 0.15)' 
                        : 'hsl(var(--beta-secondary) / 0.15)',
                      color: tournament.registration_type === 'team' 
                        ? 'hsl(var(--beta-accent))' 
                        : 'hsl(var(--beta-secondary))'
                    }}
                  >
                    {tournament.registration_type === 'team' ? (
                      <><Shield className="w-3 h-3" /> Team Tournament</>
                    ) : (
                      <><Users className="w-3 h-3" /> Solo Tournament</>
                    )}
                  </span>
                </div>

                {/* Info grid */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--beta-surface-4))] flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                    </div>
                    <div>
                      <p className="text-[hsl(var(--beta-text-muted))] text-xs">Date & Time</p>
                      <p className="text-[hsl(var(--beta-text-primary))] font-medium">
                        {format(new Date(tournament.start_time), "MMM d, yyyy")}
                        <span className="text-[hsl(var(--beta-text-muted))] font-normal ml-1">
                          {format(new Date(tournament.start_time), "h:mm a")}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--beta-surface-4))] flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 text-[hsl(var(--beta-secondary))]" />
                    </div>
                    <div>
                      <p className="text-[hsl(var(--beta-text-muted))] text-xs">Format</p>
                      <p className="text-[hsl(var(--beta-text-primary))] font-medium">
                        {formatMatchFormat(tournament.match_format)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Participants progress */}
                <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-3))] mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[hsl(var(--beta-text-muted))]">
                      {tournament.registration_type === 'team' ? 'Teams' : 'Players'}
                    </span>
                    <span className="text-sm font-semibold text-[hsl(var(--beta-text-primary))]">
                      {tournament.currentSignups} / {getMaxParticipants(tournament)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[hsl(var(--beta-surface-4))] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))] transition-all duration-300"
                      style={{ 
                        width: `${Math.min((tournament.currentSignups / getMaxParticipants(tournament)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>

                  {tournament.prize_pool && (
                    <div className="flex items-center gap-2 pt-3 border-t border-[hsl(var(--beta-border))]">
                      <Trophy className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                      <span className="text-sm text-[hsl(var(--beta-accent))] font-semibold">
                        {tournament.prize_pool}
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        {filteredTournaments.length === 0 && (
          <GlassCard className="p-12 text-center">
            <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
              No tournaments found
            </h3>
            <p className="text-[hsl(var(--beta-text-muted))]">
              Try adjusting your filters or check back later.
            </p>
          </GlassCard>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaTournaments;
