import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { BetaTeamCard } from "@/components-beta/team";
import { Shield, Search, Plus, Users, Trophy, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PersistentTeamV2, TeamLifecycleStatus } from "@/types/teamV2";

const BetaTeams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<(PersistentTeamV2 & { members: any[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamLifecycleStatus | 'all'>('active');
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
    if (user) {
      fetchUserTeam();
    }
  }, [user]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('persistent_teams')
        .select(`
          *,
          members:persistent_team_members (
            user_id,
            role,
            users (discord_username, current_rank, weight_rating)
          )
        `)
        .eq('is_active', true)
        .order('tournaments_won', { ascending: false });

      if (error) throw error;

      // Cast and map the data properly
      const mappedTeams = (data || []).map(team => ({
        ...team,
        status: (team.status || 'active') as TeamLifecycleStatus,
        members: team.members || [],
      })) as (PersistentTeamV2 & { members: any[] })[];

      setTeams(mappedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTeam = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('persistent_team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setUserTeamId(data?.team_id || null);
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.members?.some(m => m.users?.discord_username?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || team.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Shield className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading teams...</p>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              Teams Directory
            </h1>
            <p className="text-[hsl(var(--beta-text-muted))]">
              Browse registered teams and their rosters
            </p>
          </div>
          <div className="flex items-center gap-3">
            {userTeamId ? (
              <Link to="/beta/my-team">
                <BetaButton variant="secondary">
                  <Users className="w-4 h-4 mr-2" />
                  My Team
                </BetaButton>
              </Link>
            ) : user && (
              <Link to="/beta/my-team">
                <BetaButton>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </BetaButton>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-4 text-center">
            <Shield className="w-6 h-6 text-[hsl(var(--beta-accent))] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">{teams.length}</p>
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">Total Teams</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <Users className="w-6 h-6 text-[hsl(var(--beta-secondary))] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">
              {teams.reduce((sum, t) => sum + (t.members?.length || 0), 0)}
            </p>
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">Total Players</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <Trophy className="w-6 h-6 text-[hsl(var(--beta-accent))] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">
              {teams.reduce((sum, t) => sum + (t.tournaments_won || 0), 0)}
            </p>
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">Tournament Wins</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <Filter className="w-6 h-6 text-[hsl(var(--beta-text-muted))] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">
              {teams.filter(t => t.status === 'active').length}
            </p>
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">Active Teams</p>
          </GlassCard>
        </div>

        {/* Search & Filters */}
        <GlassCard className="p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--beta-text-muted))]" />
              <input
                type="text"
                placeholder="Search teams or players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] rounded-lg pl-10 pr-4 py-2.5 text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))]"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'locked'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))]'
                      : 'bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Shield className="w-16 h-16 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">No Teams Found</h2>
            <p className="text-[hsl(var(--beta-text-muted))] mb-6">
              {searchQuery ? 'Try a different search term' : 'Be the first to create a team!'}
            </p>
            {!userTeamId && user && (
              <Link to="/beta/my-team">
                <BetaButton>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </BetaButton>
              </Link>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team, idx) => (
              <div key={team.id} className="beta-animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                <BetaTeamCard team={team} />
              </div>
            ))}
          </div>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaTeams;
