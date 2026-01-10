import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTournamentData } from "@/hooks/useTournamentData";
import { useTournamentPageViews } from "@/hooks/useTournamentPageViews";
import { GradientBackground, GlassCard, BetaButton, BetaBadge, StatCard } from "@/components-beta/ui-beta";
import { 
  Trophy, Users, Calendar, Clock, ArrowLeft, Shield, Swords, 
  CheckCircle, User, Eye, Map, Crown, Play, ExternalLink,
  ScrollText, Settings, UserCheck, Info, Scale, Download, Copy, BarChart3,
  ListOrdered, UserCheck2, Wrench, GitBranch
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRankIcon, getRankColor, calculateAverageRank } from "@/utils/rankUtils";
import { useToast } from "@/hooks/use-toast";
import { TournamentChat } from "@/components-beta/TournamentChat";
import { BetaBracketPreview } from "@/components-beta/BetaBracketPreview";
import { BetaBalanceAnalysis } from "@/components-beta/BetaBalanceAnalysis";
import { BetaTeamSeedingManager, BetaTeamCheckInManager, BetaBracketRepairTool } from "@/components-beta/admin";
import BracketGenerator from "@/components/BracketGenerator";
import { BetaDisputeManager } from "@/components-beta/dispute";
import { BetaTeamTournamentRegistration } from "@/components-beta/registration";

// One-Click Registration Component for Solo Tournaments
const SoloRegistrationSection = ({ 
  tournamentId, isUserSignedUp, currentParticipants, maxParticipants, onRefresh 
}: { 
  tournamentId: string; isUserSignedUp: boolean; currentParticipants: number; maxParticipants: number; onRefresh: () => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registering, setRegistering] = useState(false);

  const handleQuickRegister = async () => {
    if (!user) {
      toast({ title: "Login required", description: "Please log in to register", variant: "destructive" });
      return;
    }
    
    setRegistering(true);
    try {
      const { error } = await supabase.from('tournament_signups').insert({ tournament_id: tournamentId, user_id: user.id });
      if (error) throw error;
      toast({ title: "Registered!", description: "You're signed up for this tournament" });
      onRefresh();
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-1">
            Registration {isUserSignedUp ? 'Complete' : 'Open'}
          </h3>
          <p className="text-sm text-[hsl(var(--beta-text-muted))]">
            {isUserSignedUp ? "You're registered for this tournament!" : `${maxParticipants - currentParticipants} spots remaining`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isUserSignedUp ? (
            <div className="flex items-center gap-2 text-[hsl(var(--beta-success))]">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Registered</span>
            </div>
          ) : user ? (
            <BetaButton onClick={handleQuickRegister} disabled={registering}>
              {registering ? 'Registering...' : 'Quick Register'}
            </BetaButton>
          ) : (
            <Link to="/login"><BetaButton>Login to Register</BetaButton></Link>
          )}
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-[hsl(var(--beta-text-muted))] mb-1">
          <span>{currentParticipants} registered</span>
          <span>{maxParticipants} max</span>
        </div>
        <div className="w-full h-2 bg-[hsl(var(--beta-surface-4))] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))] transition-all duration-500"
            style={{ width: `${Math.min((currentParticipants / maxParticipants) * 100, 100)}%` }} />
        </div>
      </div>
    </GlassCard>
  );
};

// Team Tournament Registration Section Wrapper
const TeamRegistrationSection = ({ 
  tournamentId, currentTeamCount, maxTeams, onRefresh 
}: { 
  tournamentId: string; currentTeamCount: number; maxTeams: number; onRefresh: () => void;
}) => {
  return (
    <GlassCard className="p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-1">
            Team Registration
          </h3>
          <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-4">
            {maxTeams - currentTeamCount} team slots remaining
          </p>
          <BetaTeamTournamentRegistration
            tournamentId={tournamentId}
            maxTeams={maxTeams}
            currentTeamCount={currentTeamCount}
            registrationOpen={true}
            onRegistrationChange={onRefresh}
          />
        </div>
        <div className="md:w-48">
          <div className="flex justify-between text-xs text-[hsl(var(--beta-text-muted))] mb-1">
            <span>{currentTeamCount} teams</span>
            <span>{maxTeams} max</span>
          </div>
          <div className="w-full h-2 bg-[hsl(var(--beta-surface-4))] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[hsl(var(--beta-accent))] to-[hsl(var(--beta-secondary))] transition-all duration-500"
              style={{ width: `${Math.min((currentTeamCount / maxTeams) * 100, 100)}%` }} />
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

// Beta Tabs component
const BetaTabs = ({ 
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

// Winner Display Component
const BetaWinnerDisplay = ({ tournamentId, tournamentStatus }: { tournamentId: string; tournamentStatus: string }) => {
  const [winner, setWinner] = useState<{ teamName: string; members: { id: string; discord_username: string; current_rank: string }[] } | null>(null);

  useEffect(() => {
    if (tournamentStatus !== 'completed') return;
    
    const fetchWinner = async () => {
      const { data: finalMatch } = await supabase
        .from('matches')
        .select(`winner_id, round_number, teams!matches_winner_id_fkey (id, name)`)
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed')
        .not('winner_id', 'is', null)
        .order('round_number', { ascending: false })
        .limit(1)
        .single();

      if (finalMatch?.winner_id && finalMatch.teams) {
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select(`user_id, users!team_members_user_id_fkey (id, discord_username, current_rank)`)
          .eq('team_id', finalMatch.winner_id);

        if (teamMembers) {
          setWinner({
            teamName: finalMatch.teams.name,
            members: teamMembers.map(tm => ({
              id: tm.users?.id || '',
              discord_username: tm.users?.discord_username || 'Unknown',
              current_rank: tm.users?.current_rank || 'Unranked'
            }))
          });
        }
      }
    };
    fetchWinner();
  }, [tournamentId, tournamentStatus]);

  if (!winner) return null;

  return (
    <GlassCard variant="strong" className="p-6 border-[hsl(var(--beta-accent)/0.3)] bg-gradient-to-r from-[hsl(var(--beta-accent)/0.1)] to-transparent">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
          <h3 className="text-xl font-bold text-[hsl(var(--beta-accent))]">Tournament Champions</h3>
          <Crown className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
        </div>
        <BetaBadge variant="accent" size="md">{winner.teamName}</BetaBadge>
      </div>
      <div className="space-y-2">
        {winner.members.map(member => (
          <Link key={member.id} to={`/beta/profile/${member.id}`}>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--beta-surface-3))] hover:bg-[hsl(var(--beta-surface-4))] transition-colors">
              <span className="text-[hsl(var(--beta-text-primary))] font-medium">{member.discord_username}</span>
              <BetaBadge variant="default" size="sm">{member.current_rank}</BetaBadge>
            </div>
          </Link>
        ))}
      </div>
    </GlassCard>
  );
};

// Bracket View Component
const BetaBracketView = ({ tournamentId }: { tournamentId: string }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select(`*, team1:teams!matches_team1_id_fkey (name, id), team2:teams!matches_team2_id_fkey (name, id)`)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });
      
      setMatches(data || []);
      setLoading(false);
    };
    fetchMatches();

    const channel = supabase
      .channel(`beta-bracket:${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, fetchMatches)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-8 h-8 text-[hsl(var(--beta-accent))] mx-auto mb-2 animate-pulse" />
        <p className="text-[hsl(var(--beta-text-muted))]">Loading bracket...</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
        <p className="text-[hsl(var(--beta-text-muted))]">Bracket not generated yet</p>
      </div>
    );
  }

  const roundNumbers = [...new Set(matches.map(m => m.round_number))].sort((a, b) => a - b);
  const maxRounds = Math.max(...roundNumbers);
  
  const getRoundName = (round: number) => {
    if (round === maxRounds) return "Final";
    if (round === maxRounds - 1) return "Semi-Final";
    if (round === maxRounds - 2) return "Quarter-Final";
    return `Round ${round}`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {roundNumbers.map(round => {
          const roundMatches = matches.filter(m => m.round_number === round);
          return (
            <div key={round} className="flex flex-col space-y-4 min-w-[280px]">
              <div className="text-center py-2 px-4 bg-[hsl(var(--beta-surface-3))] rounded-lg">
                <h3 className="font-bold text-[hsl(var(--beta-text-primary))]">{getRoundName(round)}</h3>
              </div>
              
              <div className="space-y-3">
                {roundMatches.map((match, idx) => (
                  <Link key={match.id} to={`/beta/match/${match.id}`}>
                    <GlassCard 
                      variant="subtle" 
                      hover 
                      className="p-3 beta-animate-fade-in"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[hsl(var(--beta-text-muted))]">Match {match.match_number}</span>
                        <BetaBadge 
                          variant={match.status === 'completed' ? 'success' : match.status === 'live' ? 'accent' : 'default'} 
                          size="sm"
                        >
                          {match.status}
                        </BetaBadge>
                      </div>
                      
                      {/* Team 1 */}
                      <div className={`p-2 rounded mb-1 flex items-center justify-between ${
                        match.winner_id === match.team1_id 
                          ? 'bg-[hsl(var(--beta-success)/0.2)] border border-[hsl(var(--beta-success)/0.5)]' 
                          : 'bg-[hsl(var(--beta-surface-4))]'
                      }`}>
                        <span className="text-sm text-[hsl(var(--beta-text-primary))]">
                          {match.team1?.name || 'TBD'}
                        </span>
                        <div className="flex items-center gap-2">
                          {match.winner_id === match.team1_id && <Trophy className="w-3 h-3 text-[hsl(var(--beta-accent))]" />}
                          <span className="font-bold text-[hsl(var(--beta-text-primary))]">{match.score_team1 || 0}</span>
                        </div>
                      </div>
                      
                      {/* Team 2 */}
                      <div className={`p-2 rounded flex items-center justify-between ${
                        match.winner_id === match.team2_id 
                          ? 'bg-[hsl(var(--beta-success)/0.2)] border border-[hsl(var(--beta-success)/0.5)]' 
                          : 'bg-[hsl(var(--beta-surface-4))]'
                      }`}>
                        <span className="text-sm text-[hsl(var(--beta-text-primary))]">
                          {match.team2?.name || 'TBD'}
                        </span>
                        <div className="flex items-center gap-2">
                          {match.winner_id === match.team2_id && <Trophy className="w-3 h-3 text-[hsl(var(--beta-accent))]" />}
                          <span className="font-bold text-[hsl(var(--beta-text-primary))]">{match.score_team2 || 0}</span>
                        </div>
                      </div>

                      {match.map_veto_enabled && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-[hsl(var(--beta-text-muted))]">
                          <Map className="w-3 h-3" />
                          <span>Map Veto</span>
                        </div>
                      )}
                    </GlassCard>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Export Teams Button Component
const ExportTeamsButton = ({ teams, tournamentName }: { teams: any[]; tournamentName: string }) => {
  const { toast } = useToast();
  
  const generateDiscordExport = () => {
    const sortedTeams = [...teams].sort((a, b) => (b.total_rank_points || 0) - (a.total_rank_points || 0));
    let exportText = `**${tournamentName} - Teams Export**\n\n`;
    
    sortedTeams.forEach((team, index) => {
      exportText += `**${index + 1}. ${team.name}** (Weight: ${team.total_rank_points ?? 0})\n`;
      
      if (team.team_members && team.team_members.length > 0) {
        team.team_members.forEach((member: any) => {
          const rank = member.users?.current_rank || "Unranked";
          const weight = member.users?.weight_rating || member.users?.rank_points || 0;
          const captain = member.is_captain ? " 👑" : "";
          exportText += `  • ${member.users?.discord_username || "Unknown"}${captain} - ${rank} (${weight})\n`;
        });
        const avgWeight = Math.round((team.total_rank_points ?? 0) / team.team_members.length);
        exportText += `  📊 Avg Weight: ${avgWeight}\n\n`;
      }
    });
    
    return exportText;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateDiscordExport());
    toast({ title: "Copied!", description: "Teams exported to clipboard" });
  };

  return (
    <button
      onClick={copyToClipboard}
      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-4))] transition-colors"
    >
      <Copy className="w-4 h-4" />
      <span className="hidden sm:inline">Export</span>
    </button>
  );
};

// Balance Analysis Display Component - Uses new clean component
// This wrapper is kept for backward compatibility but delegates to BetaBalanceAnalysis

const BetaTournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
  const { tournament, teams, matches, signups, loading } = useTournamentData();
  const { pageViews } = useTournamentPageViews(tournament?.id);
  const [activeTab, setActiveTab] = useState('overview');
  const [teamRegistrationCount, setTeamRegistrationCount] = useState(0);

  // Fetch team registration count for team tournaments
  useEffect(() => {
    const fetchTeamRegistrations = async () => {
      if (!tournament?.id || tournament.registration_type !== 'team') return;
      
      const { count, error } = await supabase
        .from('team_tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id);
      
      if (!error && count !== null) {
        setTeamRegistrationCount(count);
      }
    };
    
    fetchTeamRegistrations();

    // Subscribe to realtime updates
    if (tournament?.id && tournament.registration_type === 'team') {
      const channel = supabase
        .channel(`team-registrations-${tournament.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'team_tournament_registrations',
          filter: `tournament_id=eq.${tournament.id}`,
        }, () => {
          fetchTeamRegistrations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tournament?.id, tournament?.registration_type]);

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
            <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">Tournament Not Found</h2>
            <p className="text-[hsl(var(--beta-text-muted))] mb-6">This tournament doesn't exist or has been removed.</p>
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

  const isTeamTournament = tournament.registration_type === 'team';
  const maxParticipants = isTeamTournament ? tournament.max_teams || 8 : tournament.max_players;
  const currentParticipants = isTeamTournament ? teamRegistrationCount : (signups?.length || 0);
  const completedMatches = matches?.filter(m => m.status === 'completed').length || 0;

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'TBD';
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
    { id: 'bracket', label: 'Bracket', icon: <Trophy className="w-4 h-4" /> },
    { id: 'participants', label: 'Participants', icon: <Users className="w-4 h-4" /> },
    { id: 'rules', label: 'Rules', icon: <ScrollText className="w-4 h-4" /> },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', label: 'Admin', icon: <Settings className="w-4 h-4" /> });
  }

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

        {/* Hero Section with Banner */}
        <GlassCard 
          variant="strong" 
          className="p-0 relative overflow-hidden"
          style={{
            backgroundImage: tournament.banner_image_url ? `url(${tournament.banner_image_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--beta-surface-1))] via-[hsl(var(--beta-surface-1)/0.9)] to-transparent" />
          
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <BetaBadge variant={getStatusVariant(tournament.status)} size="md">
                    {tournament.status}
                  </BetaBadge>
                  <span className="text-sm text-[hsl(var(--beta-text-muted))]">{tournament.match_format}</span>
                  <div className="flex items-center gap-1 text-sm text-[hsl(var(--beta-text-muted))]">
                    <Eye className="w-4 h-4" />
                    <span>{pageViews} views</span>
                  </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
                  {tournament.name}
                </h1>
                {tournament.description && (
                  <p className="text-[hsl(var(--beta-text-secondary))] max-w-2xl">{tournament.description}</p>
                )}
                
                {/* Quick Info */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
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

              {/* Admin/View Full Page Button */}
              <div className="flex gap-2">
                <Link to={`/tournament/${id}`}>
                  <BetaButton variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Full Page
                  </BetaButton>
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Participants" value={`${currentParticipants}/${maxParticipants}`} icon={<Users />} />
          <StatCard label="Teams" value={teams?.length || 0} icon={<Shield />} />
          <StatCard label="Matches" value={`${completedMatches}/${matches?.length || 0}`} icon={<Swords />} />
          <StatCard label="Team Size" value={`${tournament.team_size}v${tournament.team_size}`} icon={<UserCheck />} />
          <StatCard label="Format" value={tournament.bracket_type?.replace('_', ' ') || 'Single Elim'} icon={<Trophy />} valueClassName="text-sm" />
        </div>

        {/* Winner Display for Completed Tournaments */}
        {tournament.status === 'completed' && (
          <BetaWinnerDisplay tournamentId={tournament.id} tournamentStatus={tournament.status} />
        )}

        {/* Live Bracket Preview for Live Tournaments */}
        {tournament.status === 'live' && matches && matches.length > 0 && (
          <BetaBracketPreview tournamentId={tournament.id} tournamentName={tournament.name} />
        )}

        {/* Registration Status */}
        {tournament.status === 'open' && (
          isTeamTournament ? (
            <TeamRegistrationSection 
              tournamentId={tournament.id}
              currentTeamCount={teamRegistrationCount}
              maxTeams={tournament.max_teams || 8}
              onRefresh={() => {
                // Refetch team registrations
                supabase
                  .from('team_tournament_registrations')
                  .select('id', { count: 'exact', head: true })
                  .eq('tournament_id', tournament.id)
                  .then(({ count }) => {
                    if (count !== null) setTeamRegistrationCount(count);
                  });
              }}
            />
          ) : (
            <SoloRegistrationSection 
              tournamentId={tournament.id}
              isUserSignedUp={isUserSignedUp}
              currentParticipants={currentParticipants}
              maxParticipants={maxParticipants}
              onRefresh={() => window.location.reload()}
            />
          )
        )}

        {/* Tabs Navigation */}
        <BetaTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tournament Info */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                Tournament Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[hsl(var(--beta-text-muted))]">Format</span>
                  <p className="text-[hsl(var(--beta-text-primary))] font-medium">{tournament.bracket_type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-[hsl(var(--beta-text-muted))]">Team Size</span>
                  <p className="text-[hsl(var(--beta-text-primary))] font-medium">{tournament.team_size}v{tournament.team_size}</p>
                </div>
                <div>
                  <span className="text-[hsl(var(--beta-text-muted))]">Max Teams</span>
                  <p className="text-[hsl(var(--beta-text-primary))] font-medium">{tournament.max_teams}</p>
                </div>
                <div>
                  <span className="text-[hsl(var(--beta-text-muted))]">Max Players</span>
                  <p className="text-[hsl(var(--beta-text-primary))] font-medium">{tournament.max_players}</p>
                </div>
                {tournament.enable_map_veto && (
                  <div className="col-span-2">
                    <span className="text-[hsl(var(--beta-text-muted))]">Map Veto</span>
                    <p className="text-[hsl(var(--beta-success))] font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Enabled
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Timeline */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                Timeline
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[hsl(var(--beta-accent))]" />
                  <div>
                    <span className="text-[hsl(var(--beta-text-muted))]">Registration Opens</span>
                    <p className="text-[hsl(var(--beta-text-primary))]">{formatDateTime(tournament.registration_opens_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[hsl(var(--beta-warning))]" />
                  <div>
                    <span className="text-[hsl(var(--beta-text-muted))]">Registration Closes</span>
                    <p className="text-[hsl(var(--beta-text-primary))]">{formatDateTime(tournament.registration_closes_at)}</p>
                  </div>
                </div>
                {tournament.check_in_required && (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-[hsl(var(--beta-secondary))]" />
                      <div>
                        <span className="text-[hsl(var(--beta-text-muted))]">Check-in Starts</span>
                        <p className="text-[hsl(var(--beta-text-primary))]">{formatDateTime(tournament.check_in_starts_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-[hsl(var(--beta-error))]" />
                      <div>
                        <span className="text-[hsl(var(--beta-text-muted))]">Check-in Ends</span>
                        <p className="text-[hsl(var(--beta-text-primary))]">{formatDateTime(tournament.check_in_ends_at)}</p>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[hsl(var(--beta-success))]" />
                  <div>
                    <span className="text-[hsl(var(--beta-text-muted))]">Tournament Starts</span>
                    <p className="text-[hsl(var(--beta-text-primary))]">{formatDateTime(tournament.start_time)}</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Teams Preview */}
            {teams && teams.length > 0 && (
              <GlassCard className="p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                    Teams ({teams.length})
                  </h3>
                  <ExportTeamsButton teams={teams} tournamentName={tournament.name} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...teams].sort((a, b) => (b.total_rank_points || 0) - (a.total_rank_points || 0)).slice(0, 8).map((team, index) => (
                    <GlassCard 
                      key={team.id} 
                      variant="subtle" 
                      className="p-4 beta-animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-[hsl(var(--beta-text-primary))] truncate">{team.name}</h4>
                        {team.seed && <BetaBadge variant="accent" size="sm">#{team.seed}</BetaBadge>}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Scale className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-purple-300 font-medium">Weight: {team.total_rank_points ?? 0}</span>
                      </div>
                      <div className="space-y-1">
                        {team.team_members?.slice(0, 5).map((member: any) => (
                          <div key={member.user_id} className="flex items-center justify-between text-xs">
                            <span className={`truncate ${member.is_captain ? 'text-[hsl(var(--beta-accent))]' : 'text-[hsl(var(--beta-text-secondary))]'}`}>
                              {member.is_captain && <Crown className="w-3 h-3 inline mr-1" />}
                              {member.users?.discord_username}
                            </span>
                            <span style={{ color: getRankColor(member.users?.current_rank) }}>
                              {getRankIcon(member.users?.current_rank)} {member.users?.current_rank || 'Unranked'}
                            </span>
                          </div>
                        ))}
                      </div>
                      {team.team_members && team.team_members.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[hsl(var(--beta-border))] text-xs text-[hsl(var(--beta-text-muted))]">
                          Avg: {calculateAverageRank(team.team_members.map((m: any) => m.users?.current_rank))} | 
                          Weight/Player: {Math.round((team.total_rank_points ?? 0) / team.team_members.length)}
                        </div>
                      )}
                    </GlassCard>
                  ))}
                </div>
                {teams.length > 8 && (
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => setActiveTab('participants')}
                      className="text-sm text-[hsl(var(--beta-accent))] hover:underline"
                    >
                      View all {teams.length} teams →
                    </button>
                  </div>
                )}
              </GlassCard>
            )}

            {/* Tournament Chat - Above Balance Analysis */}
            <div className="lg:col-span-2">
              <TournamentChat tournamentId={tournament.id} />
            </div>

            {/* Balance Analysis - Clean new display */}
            {tournament.balance_analysis && (
              <div className="lg:col-span-2">
                <BetaBalanceAnalysis 
                  analysis={tournament.balance_analysis} 
                  teams={teams}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'bracket' && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                Tournament Bracket
              </h3>
              <Link to={`/bracket/${id}`}>
                <BetaButton variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Full Bracket View
                </BetaButton>
              </Link>
            </div>
            <BetaBracketView tournamentId={tournament.id} />
          </GlassCard>
        )}

        {activeTab === 'participants' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              {tournament.registration_type === 'team' ? `Teams (${teams?.length || 0})` : `Registered Players (${signups?.length || 0})`}
            </h3>
            
            {tournament.registration_type === 'team' ? (
              <div className="space-y-4">
                {[...teams].sort((a, b) => (b.total_rank_points || 0) - (a.total_rank_points || 0))?.map((team, index) => (
                  <GlassCard 
                    key={team.id} 
                    variant="subtle" 
                    className="p-4 beta-animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-lg text-[hsl(var(--beta-text-primary))]">{team.name}</h4>
                        {team.seed && <BetaBadge variant="accent" size="sm">Seed #{team.seed}</BetaBadge>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
                          <Scale className="w-4 h-4 text-purple-400" />
                          <span className="text-sm text-purple-300 font-semibold">Weight: {team.total_rank_points ?? 0}</span>
                        </div>
                        {team.team_members && team.team_members.length > 0 && (
                          <span className="text-xs text-[hsl(var(--beta-text-muted))]">
                            Avg: {Math.round((team.total_rank_points ?? 0) / team.team_members.length)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                      {team.team_members?.map((member: any) => (
                        <Link key={member.user_id} to={`/beta/profile/${member.user_id}`}>
                          <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                            member.is_captain 
                              ? 'bg-[hsl(var(--beta-accent)/0.15)] border border-[hsl(var(--beta-accent)/0.3)]' 
                              : 'bg-[hsl(var(--beta-surface-4))] hover:bg-[hsl(var(--beta-surface-3))]'
                          }`}>
                            <div className="w-8 h-8 rounded-full bg-[hsl(var(--beta-surface-3))] flex items-center justify-center overflow-hidden flex-shrink-0">
                              {member.users?.discord_avatar_url ? (
                                <img src={member.users.discord_avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                {member.is_captain && <Crown className="w-3 h-3 text-[hsl(var(--beta-accent))] flex-shrink-0" />}
                                <p className="text-sm text-[hsl(var(--beta-text-primary))] truncate">{member.users?.discord_username}</p>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <span style={{ color: getRankColor(member.users?.current_rank) }}>
                                  {getRankIcon(member.users?.current_rank)} {member.users?.current_rank || 'Unranked'}
                                </span>
                                <span className="text-purple-400">({member.users?.weight_rating || member.users?.rank_points || 0})</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {team.team_members && team.team_members.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[hsl(var(--beta-border))] flex flex-wrap gap-4 text-xs text-[hsl(var(--beta-text-muted))]">
                        <span>
                          Average Rank: <span style={{ color: getRankColor(calculateAverageRank(team.team_members.map((m: any) => m.users?.current_rank))) }}>
                            {calculateAverageRank(team.team_members.map((m: any) => m.users?.current_rank))}
                          </span>
                        </span>
                        <span>
                          Average Weight: <span className="text-purple-300">{Math.round((team.total_rank_points ?? 0) / team.team_members.length)}</span>
                        </span>
                        <span>Players: {team.team_members.length}</span>
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {signups?.map((signup, index) => (
                  <Link key={signup.id} to={`/beta/profile/${signup.user_id}`} className="beta-animate-fade-in" style={{ animationDelay: `${index * 20}ms` }}>
                    <GlassCard variant="subtle" hover className="p-3 text-center group">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center overflow-hidden">
                        {signup.users?.discord_avatar_url ? (
                          <img src={signup.users.discord_avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-[hsl(var(--beta-text-muted))]" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))] truncate group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                        {signup.users?.discord_username || 'Unknown'}
                      </p>
                      {signup.users?.current_rank && (
                        <p className="text-xs text-[hsl(var(--beta-text-muted))] truncate">{signup.users.current_rank}</p>
                      )}
                    </GlassCard>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {activeTab === 'rules' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-6 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              Tournament Rules
            </h3>
            <div className="prose prose-invert max-w-none">
              <div className="space-y-4 text-[hsl(var(--beta-text-secondary))]">
                <div className="p-4 rounded-lg bg-[hsl(var(--beta-surface-3))]">
                  <h4 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">General Rules</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>All players must be checked in before the tournament starts</li>
                    <li>Teams must have the required number of players ({tournament.team_size})</li>
                    <li>Match format: {tournament.match_format}</li>
                    <li>Bracket type: {tournament.bracket_type?.replace('_', ' ')}</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-[hsl(var(--beta-surface-3))]">
                  <h4 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">Match Rules</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Default game settings must be used</li>
                    <li>Screenshots of final scores must be submitted</li>
                    {tournament.enable_map_veto && <li>Map veto system is enabled for this tournament</li>}
                  </ul>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                Admin Controls
              </h3>
              <div className="flex flex-wrap gap-3 mb-6">
                <Link to={`/beta/admin`}>
                  <BetaButton variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Beta Admin Panel
                  </BetaButton>
                </Link>
                <Link to={`/tournament/${id}`}>
                  <BetaButton>
                    <Shield className="w-4 h-4 mr-2" />
                    Full Admin Dashboard
                  </BetaButton>
                </Link>
              </div>
            </GlassCard>

            {/* Bracket Generator - only for balancing status with no matches */}
            {tournament.status === 'balancing' && (!matches || matches.length === 0) && (
              <GlassCard className="p-6">
                <h4 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                  Generate Bracket
                </h4>
                <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-4">
                  Generate the tournament bracket from the registered teams. This will create matches for all rounds.
                </p>
                <BracketGenerator 
                  tournamentId={tournament.id}
                  teams={teams || []}
                  onBracketGenerated={() => window.location.reload()}
                />
              </GlassCard>
            )}

            {/* Bracket Repair Tool - for live/completed tournaments with matches */}
            {['live', 'completed'].includes(tournament.status) && matches && matches.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                  Bracket Repair Tool
                </h4>
                <BetaBracketRepairTool 
                  tournamentId={tournament.id}
                  onRepairComplete={() => window.location.reload()}
                />
              </div>
            )}

            {/* Team Seeding Manager - only for team tournaments in open/balancing status */}
            {tournament.registration_type === 'team' && ['open', 'balancing'].includes(tournament.status) && (
              <div>
                <h4 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                  Team Seeding
                </h4>
                <BetaTeamSeedingManager tournamentId={tournament.id} />
              </div>
            )}

            {/* Team Check-In Manager - only for tournaments with check-in required */}
            {tournament.registration_type === 'team' && tournament.check_in_required && ['open', 'balancing'].includes(tournament.status) && (
              <div>
                <h4 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
                  <UserCheck2 className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                  Team Check-In
                </h4>
                <BetaTeamCheckInManager 
                  tournamentId={tournament.id}
                  checkInDeadline={tournament.check_in_ends_at}
                />
              </div>
            )}

            {/* Dispute Manager */}
            <div>
              <BetaDisputeManager tournamentId={tournament.id} />
            </div>
          </div>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaTournamentDetail;
