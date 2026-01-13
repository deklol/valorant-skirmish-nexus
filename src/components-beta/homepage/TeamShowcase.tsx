import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard, BetaBadge } from "@/components-beta/ui-beta";
import { Users, Trophy, Crown, ArrowRight } from "lucide-react";

interface PersistentTeam {
  id: string;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  wins: number | null;
  losses: number | null;
  tournaments_won: number | null;
  tournaments_played: number | null;
  captain_id: string;
  memberCount: number;
}

export const TeamShowcase = () => {
  const [teams, setTeams] = useState<PersistentTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        // Fetch active persistent teams with good stats
        const { data: teamsData, error } = await supabase
          .from("persistent_teams")
          .select(`
            id, name, description, banner_image_url,
            wins, losses, tournaments_won, tournaments_played, captain_id
          `)
          .eq("is_active", true)
          .not("disbanded_at", "is", null)
          .order("tournaments_won", { ascending: false })
          .limit(6);

        if (error) {
          // Try without the disbanded_at filter if it fails
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("persistent_teams")
            .select(`
              id, name, description, banner_image_url,
              wins, losses, tournaments_won, tournaments_played, captain_id
            `)
            .eq("is_active", true)
            .order("tournaments_won", { ascending: false })
            .limit(6);
          
          if (fallbackError) throw fallbackError;
          
          // Get member counts
          const teamsWithMembers = await Promise.all(
            (fallbackData || []).map(async (team) => {
              const { count } = await supabase
                .from("persistent_team_members")
                .select("*", { count: "exact", head: true })
                .eq("team_id", team.id);
              return { ...team, memberCount: count || 0 };
            })
          );
          
          setTeams(teamsWithMembers);
        } else {
          // Get member counts
          const teamsWithMembers = await Promise.all(
            (teamsData || []).map(async (team) => {
              const { count } = await supabase
                .from("persistent_team_members")
                .select("*", { count: "exact", head: true })
                .eq("team_id", team.id);
              return { ...team, memberCount: count || 0 };
            })
          );
          
          setTeams(teamsWithMembers);
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))]">
          Featured Teams
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="h-48 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (teams.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))]">
          Featured Teams
        </h2>
        <Link 
          to="/beta/teams" 
          className="text-sm text-[hsl(var(--beta-accent))] hover:underline flex items-center gap-1"
        >
          View all teams
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <Link key={team.id} to={`/beta/team/${team.id}`}>
            <GlassCard variant="interactive" className="h-full overflow-hidden group">
              {/* Banner */}
              <div className="relative h-24 bg-gradient-to-br from-[hsl(var(--beta-accent)/0.3)] to-[hsl(var(--beta-surface-3))]">
                {team.banner_image_url && (
                  <img
                    src={team.banner_image_url}
                    alt={team.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--beta-surface-2))] to-transparent" />
                
                {/* Tournaments won badge */}
                {(team.tournaments_won || 0) > 0 && (
                  <div className="absolute top-2 right-2">
                    <BetaBadge variant="accent" size="sm">
                      <Crown className="w-3 h-3 mr-1" />
                      {team.tournaments_won}x Champion
                    </BetaBadge>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors truncate">
                  {team.name}
                </h3>
                
                {team.description && (
                  <p className="text-xs text-[hsl(var(--beta-text-muted))] line-clamp-2">
                    {team.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-[hsl(var(--beta-text-muted))]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {team.memberCount} members
                  </span>
                  {(team.wins || team.losses) && (
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {team.wins || 0}W - {team.losses || 0}L
                    </span>
                  )}
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default TeamShowcase;
