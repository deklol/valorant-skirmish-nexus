import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard, BetaBadge, BetaButton } from '@/components-beta/ui-beta';
import { 
  AlertTriangle, Users, Clock, Trophy, ChevronRight, 
  RefreshCw, CheckCircle, XCircle, AlertCircle, Swords,
  UserX, MessageCircle
} from 'lucide-react';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';

// Team tournament alerts
interface RosterAlert {
  type: 'incomplete_roster';
  severity: 'error' | 'warning';
  tournamentId: string;
  tournamentName: string;
  teamId: string;
  teamName: string;
  currentMembers: number;
  requiredMembers: number;
  hoursUntilStart: number;
  startTime: string;
}

// Solo/skirmish tournament alerts
interface CheckInAlert {
  type: 'players_not_checked_in';
  severity: 'error' | 'warning';
  tournamentId: string;
  tournamentName: string;
  uncheckedPlayers: { userId: string; username: string; discordUsername?: string }[];
  hoursUntilStart: number;
  startTime: string;
}

interface LowRegistrationAlert {
  type: 'low_registration';
  severity: 'warning' | 'error';
  tournamentId: string;
  tournamentName: string;
  currentCount: number;
  maxPlayers: number;
  daysUntilStart: number;
  registrationType: string;
}

// Match/score alerts
interface ScoreAlert {
  type: 'pending_score' | 'disputed_score' | 'stale_match';
  severity: 'error' | 'warning';
  matchId: string;
  team1Name: string;
  team2Name: string;
  tournamentId: string;
  tournamentName: string;
  pendingMinutes?: number;
}

interface TournamentAlert {
  type: 'upcoming_no_teams' | 'upcoming_no_players' | 'registration_closing_soon';
  severity: 'error' | 'warning' | 'info';
  tournamentId: string;
  tournamentName: string;
  message: string;
  hoursUntilStart?: number;
}

type AdminAlert = RosterAlert | TournamentAlert | CheckInAlert | LowRegistrationAlert | ScoreAlert;

export function AdminAlertCenter() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    const newAlerts: AdminAlert[] = [];

    try {
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      
      // ========== TEAM TOURNAMENTS ==========
      const { data: upcomingTeamTournaments } = await supabase
        .from('tournaments')
        .select('id, name, start_time, team_size, registration_type, status, max_teams')
        .eq('registration_type', 'team')
        .in('status', ['open', 'balancing'])
        .lte('start_time', in48Hours.toISOString())
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true });

      for (const tournament of upcomingTeamTournaments || []) {
        const hoursUntilStart = differenceInHours(new Date(tournament.start_time), now);
        
        const { data: registrations } = await supabase
          .from('team_tournament_registrations')
          .select(`
            team_id,
            persistent_teams!inner (id, name)
          `)
          .eq('tournament_id', tournament.id)
          .eq('status', 'registered');

        if (!registrations || registrations.length === 0) {
          newAlerts.push({
            type: 'upcoming_no_teams',
            severity: hoursUntilStart < 12 ? 'error' : 'warning',
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            message: `No teams registered - starts in ${hoursUntilStart}h`,
            hoursUntilStart,
          });
          continue;
        }

        for (const reg of registrations) {
          const team = reg.persistent_teams as { id: string; name: string };
          
          const { count: memberCount } = await supabase
            .from('persistent_team_members')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', team.id);

          const requiredMembers = tournament.team_size || 5;
          
          if ((memberCount || 0) < requiredMembers) {
            newAlerts.push({
              type: 'incomplete_roster',
              severity: hoursUntilStart < 24 ? 'error' : 'warning',
              tournamentId: tournament.id,
              tournamentName: tournament.name,
              teamId: team.id,
              teamName: team.name,
              currentMembers: memberCount || 0,
              requiredMembers,
              hoursUntilStart,
              startTime: tournament.start_time,
            });
          }
        }
      }

      // ========== SOLO/SKIRMISH TOURNAMENTS ==========
      const { data: upcomingSoloTournaments } = await supabase
        .from('tournaments')
        .select('id, name, start_time, max_players, registration_type, status')
        .eq('registration_type', 'solo')
        .in('status', ['open', 'live', 'balancing'])
        .lte('start_time', in72Hours.toISOString())
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true });

      for (const tournament of upcomingSoloTournaments || []) {
        const hoursUntilStart = differenceInHours(new Date(tournament.start_time), now);
        const daysUntilStart = differenceInDays(new Date(tournament.start_time), now);
        
        const { data: signups, count: signupCount } = await supabase
          .from('tournament_signups')
          .select('user_id, is_checked_in, users!inner(id, username, discord_username)', { count: 'exact' })
          .eq('tournament_id', tournament.id);

        // No players registered
        if (!signups || signups.length === 0) {
          newAlerts.push({
            type: 'upcoming_no_players',
            severity: hoursUntilStart < 12 ? 'error' : 'warning',
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            message: `No players registered - starts in ${hoursUntilStart}h`,
            hoursUntilStart,
          });
          continue;
        }

        // Low registration warning (2-3 days out)
        const maxPlayers = tournament.max_players || 20;
        if (daysUntilStart <= 3 && (signupCount || 0) < maxPlayers * 0.5) {
          newAlerts.push({
            type: 'low_registration',
            severity: daysUntilStart <= 1 ? 'error' : 'warning',
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            currentCount: signupCount || 0,
            maxPlayers,
            daysUntilStart,
            registrationType: 'solo',
          });
        }

        // Players not checked in (< 2 hours before start)
        if (hoursUntilStart <= 2) {
          const unchecked = signups.filter(s => !s.is_checked_in);
          if (unchecked.length > 0) {
            const uncheckedPlayers = unchecked.map(s => {
              const user = s.users as unknown as { id: string; username: string; discord_username?: string };
              return {
                userId: user.id,
                username: user.username || 'Unknown',
                discordUsername: user.discord_username,
              };
            });

            newAlerts.push({
              type: 'players_not_checked_in',
              severity: hoursUntilStart < 1 ? 'error' : 'warning',
              tournamentId: tournament.id,
              tournamentName: tournament.name,
              uncheckedPlayers,
              hoursUntilStart,
              startTime: tournament.start_time,
            });
          }
        }
      }

      // ========== SCORE/MATCH ALERTS ==========
      // Pending score submissions (> 30 mins)
      const { data: pendingSubmissions } = await supabase
        .from('match_result_submissions')
        .select(`
          id, submitted_at, match_id,
          matches!inner (
            id, tournament_id,
            team1:teams!matches_team1_id_fkey(id, name),
            team2:teams!matches_team2_id_fkey(id, name),
            tournaments!inner(id, name)
          )
        `)
        .eq('status', 'pending')
        .lte('submitted_at', new Date(now.getTime() - 30 * 60 * 1000).toISOString());

      for (const submission of pendingSubmissions || []) {
        const match = submission.matches as any;
        const pendingMinutes = Math.floor((now.getTime() - new Date(submission.submitted_at).getTime()) / 60000);
        
        newAlerts.push({
          type: 'pending_score',
          severity: pendingMinutes > 60 ? 'error' : 'warning',
          matchId: match.id,
          team1Name: match.team1?.name || 'Team 1',
          team2Name: match.team2?.name || 'Team 2',
          tournamentId: match.tournaments.id,
          tournamentName: match.tournaments.name,
          pendingMinutes,
        });
      }

      // Disputed scores
      const { data: disputedSubmissions } = await supabase
        .from('match_result_submissions')
        .select(`
          id, match_id,
          matches!inner (
            id, tournament_id,
            team1:teams!matches_team1_id_fkey(id, name),
            team2:teams!matches_team2_id_fkey(id, name),
            tournaments!inner(id, name)
          )
        `)
        .eq('status', 'disputed');

      for (const submission of disputedSubmissions || []) {
        const match = submission.matches as any;
        
        newAlerts.push({
          type: 'disputed_score',
          severity: 'error',
          matchId: match.id,
          team1Name: match.team1?.name || 'Team 1',
          team2Name: match.team2?.name || 'Team 2',
          tournamentId: match.tournaments.id,
          tournamentName: match.tournaments.name,
        });
      }

      // Stale in-progress matches (no activity for 1+ hour)
      const { data: staleMatches } = await supabase
        .from('matches')
        .select(`
          id, started_at, tournament_id,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name),
          tournaments!inner(id, name)
        `)
        .eq('status', 'live')
        .lte('started_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString());

      for (const match of staleMatches || []) {
        // Check if there are any score submissions
        const { count } = await supabase
          .from('match_result_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('match_id', match.id);

        if ((count || 0) === 0) {
          newAlerts.push({
            type: 'stale_match',
            severity: 'warning',
            matchId: match.id,
            team1Name: (match.team1 as any)?.name || 'Team 1',
            team2Name: (match.team2 as any)?.name || 'Team 2',
            tournamentId: (match.tournaments as any).id,
            tournamentName: (match.tournaments as any).name,
          });
        }
      }

      // Sort alerts by severity and time
      newAlerts.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        if ('hoursUntilStart' in a && 'hoursUntilStart' in b) {
          return (a.hoursUntilStart || 999) - (b.hoursUntilStart || 999);
        }
        return 0;
      });

      setAlerts(newAlerts);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching admin alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyles = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return {
          bg: 'bg-[hsl(var(--beta-error)/0.1)]',
          border: 'border-[hsl(var(--beta-error)/0.3)]',
          icon: <XCircle className="w-5 h-5 text-[hsl(var(--beta-error))]" />,
          badge: 'error' as const,
        };
      case 'warning':
        return {
          bg: 'bg-[hsl(var(--beta-warning)/0.1)]',
          border: 'border-[hsl(var(--beta-warning)/0.3)]',
          icon: <AlertTriangle className="w-5 h-5 text-[hsl(var(--beta-warning))]" />,
          badge: 'warning' as const,
        };
      case 'info':
        return {
          bg: 'bg-[hsl(var(--beta-accent)/0.1)]',
          border: 'border-[hsl(var(--beta-accent)/0.3)]',
          icon: <AlertCircle className="w-5 h-5 text-[hsl(var(--beta-accent))]" />,
          badge: 'accent' as const,
        };
    }
  };

  const renderAlert = (alert: AdminAlert, idx: number) => {
    const styles = getSeverityStyles(alert.severity);

    // Incomplete roster alert
    if (alert.type === 'incomplete_roster') {
      return (
        <div 
          key={`roster-${alert.teamId}-${idx}`}
          className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
        >
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-[hsl(var(--beta-error))]" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[hsl(var(--beta-text-primary))]">
                  Incomplete Roster
                </span>
                <BetaBadge variant={styles.badge} size="sm">
                  {alert.hoursUntilStart}h until start
                </BetaBadge>
              </div>
              <p className="text-sm text-[hsl(var(--beta-text-secondary))] mt-1">
                <strong>{alert.teamName}</strong> has only {alert.currentMembers}/{alert.requiredMembers} players
                for <strong>{alert.tournamentName}</strong>
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-[hsl(var(--beta-text-muted))]">
                <Clock className="w-3.5 h-3.5" />
                <span>Starts {format(new Date(alert.startTime), "MMM d 'at' h:mm a")}</span>
              </div>
            </div>
            <Link to={`/beta/tournament/${alert.tournamentId}`}>
              <BetaButton variant="ghost" size="sm">
                <ChevronRight className="w-4 h-4" />
              </BetaButton>
            </Link>
          </div>
        </div>
      );
    }

    // Players not checked in
    if (alert.type === 'players_not_checked_in') {
      const discordNames = alert.uncheckedPlayers
        .filter(p => p.discordUsername)
        .map(p => p.discordUsername)
        .join(', ');
      const regularNames = alert.uncheckedPlayers.map(p => p.username).join(', ');

      return (
        <div 
          key={`checkin-${alert.tournamentId}-${idx}`}
          className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
        >
          <div className="flex items-start gap-3">
            <UserX className="w-5 h-5 text-[hsl(var(--beta-warning))]" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[hsl(var(--beta-text-primary))]">
                  Players Not Checked In
                </span>
                <BetaBadge variant={styles.badge} size="sm">
                  {alert.hoursUntilStart < 1 ? '<1h' : `${alert.hoursUntilStart}h`} until start
                </BetaBadge>
              </div>
              <p className="text-sm text-[hsl(var(--beta-text-secondary))] mt-1">
                <strong>{alert.uncheckedPlayers.length}</strong> player(s) haven't checked in for <strong>{alert.tournamentName}</strong>
              </p>
              {discordNames && (
                <div className="flex items-center gap-2 mt-2 text-xs text-[hsl(var(--beta-text-muted))]">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="truncate">Discord: {discordNames}</span>
                </div>
              )}
              <div className="text-xs text-[hsl(var(--beta-text-muted))] mt-1 truncate">
                Users: {regularNames}
              </div>
            </div>
            <Link to={`/beta/tournament/${alert.tournamentId}`}>
              <BetaButton variant="ghost" size="sm">
                <ChevronRight className="w-4 h-4" />
              </BetaButton>
            </Link>
          </div>
        </div>
      );
    }

    // Low registration
    if (alert.type === 'low_registration') {
      return (
        <div 
          key={`lowreg-${alert.tournamentId}-${idx}`}
          className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
        >
          <div className="flex items-start gap-3">
            {styles.icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[hsl(var(--beta-text-primary))]">
                  Low Registration
                </span>
                <BetaBadge variant={styles.badge} size="sm">
                  {alert.daysUntilStart}d until start
                </BetaBadge>
              </div>
              <p className="text-sm text-[hsl(var(--beta-text-secondary))] mt-1">
                <strong>{alert.tournamentName}</strong> has only {alert.currentCount}/{alert.maxPlayers} {alert.registrationType === 'team' ? 'teams' : 'players'} registered
              </p>
            </div>
            <Link to={`/beta/tournament/${alert.tournamentId}`}>
              <BetaButton variant="ghost" size="sm">
                <ChevronRight className="w-4 h-4" />
              </BetaButton>
            </Link>
          </div>
        </div>
      );
    }

    // Score alerts (pending, disputed, stale)
    if (alert.type === 'pending_score' || alert.type === 'disputed_score' || alert.type === 'stale_match') {
      const alertLabels = {
        pending_score: 'Pending Score Confirmation',
        disputed_score: 'Disputed Score',
        stale_match: 'Stale Match',
      };
      
      return (
        <div 
          key={`score-${alert.matchId}-${idx}`}
          className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
        >
          <div className="flex items-start gap-3">
            <Swords className={`w-5 h-5 ${alert.type === 'disputed_score' ? 'text-[hsl(var(--beta-error))]' : 'text-[hsl(var(--beta-warning))]'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[hsl(var(--beta-text-primary))]">
                  {alertLabels[alert.type]}
                </span>
                {alert.pendingMinutes && (
                  <BetaBadge variant={styles.badge} size="sm">
                    {alert.pendingMinutes}min pending
                  </BetaBadge>
                )}
              </div>
              <p className="text-sm text-[hsl(var(--beta-text-secondary))] mt-1">
                <strong>{alert.team1Name}</strong> vs <strong>{alert.team2Name}</strong>
              </p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">
                {alert.tournamentName}
              </p>
            </div>
            <Link to={`/beta/match/${alert.matchId}`}>
              <BetaButton variant="ghost" size="sm">
                <ChevronRight className="w-4 h-4" />
              </BetaButton>
            </Link>
          </div>
        </div>
      );
    }

    // Generic tournament alerts
    const tournamentAlert = alert as TournamentAlert;
    return (
      <div 
        key={`tournament-${tournamentAlert.tournamentId}-${idx}`}
        className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
      >
        <div className="flex items-start gap-3">
          {styles.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[hsl(var(--beta-text-primary))]">
                {tournamentAlert.tournamentName}
              </span>
              {tournamentAlert.hoursUntilStart !== undefined && (
                <BetaBadge variant={styles.badge} size="sm">
                  {tournamentAlert.hoursUntilStart}h
                </BetaBadge>
              )}
            </div>
            <p className="text-sm text-[hsl(var(--beta-text-secondary))] mt-1">
              {tournamentAlert.message}
            </p>
          </div>
          <Link to={`/beta/tournament/${tournamentAlert.tournamentId}`}>
            <BetaButton variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </BetaButton>
          </Link>
        </div>
      </div>
    );
  };

  const errorCount = alerts.filter(a => a.severity === 'error').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[hsl(var(--beta-error)/0.1)]">
            <AlertTriangle className="w-5 h-5 text-[hsl(var(--beta-error))]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
              System Alerts
            </h3>
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">
              Last checked: {format(lastRefresh, 'HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <BetaBadge variant="error" size="md">{errorCount} Critical</BetaBadge>
          )}
          {warningCount > 0 && (
            <BetaBadge variant="warning" size="md">{warningCount} Warnings</BetaBadge>
          )}
          <BetaButton 
            variant="ghost" 
            size="sm" 
            onClick={fetchAlerts}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </BetaButton>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle className="w-12 h-12 text-[hsl(var(--beta-success))] mx-auto mb-3" />
          <p className="text-[hsl(var(--beta-text-primary))] font-medium">All Systems Healthy</p>
          <p className="text-sm text-[hsl(var(--beta-text-muted))]">No roster, registration, or score issues detected</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map((alert, idx) => renderAlert(alert, idx))}
        </div>
      )}
    </GlassCard>
  );
}