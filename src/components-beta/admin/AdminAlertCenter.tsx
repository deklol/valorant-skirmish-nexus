import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard, BetaBadge, BetaButton } from '@/components-beta/ui-beta';
import { 
  AlertTriangle, Users, Clock, Trophy, ChevronRight, 
  RefreshCw, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { Link } from 'react-router-dom';

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

interface TournamentAlert {
  type: 'upcoming_no_teams' | 'registration_closing_soon' | 'check_in_issue';
  severity: 'error' | 'warning' | 'info';
  tournamentId: string;
  tournamentName: string;
  message: string;
  hoursUntilStart?: number;
}

type AdminAlert = RosterAlert | TournamentAlert;

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
      // Get upcoming team tournaments (within next 48 hours)
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const { data: upcomingTournaments, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id, name, start_time, team_size, registration_type, status, max_teams')
        .eq('registration_type', 'team')
        .in('status', ['open', 'balancing'])
        .lte('start_time', in48Hours.toISOString())
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true });

      if (tournamentError) throw tournamentError;

      // Check each tournament for roster issues
      for (const tournament of upcomingTournaments || []) {
        const hoursUntilStart = differenceInHours(new Date(tournament.start_time), now);
        
        // Get registered teams with member counts
        const { data: registrations, error: regError } = await supabase
          .from('team_tournament_registrations')
          .select(`
            team_id,
            persistent_teams!inner (
              id,
              name
            )
          `)
          .eq('tournament_id', tournament.id)
          .eq('status', 'registered');

        if (regError) continue;

        // Check if no teams registered
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

        // Check each team's roster
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
          <p className="text-sm text-[hsl(var(--beta-text-muted))]">No roster or tournament issues detected</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map((alert, idx) => {
            const styles = getSeverityStyles(alert.severity);
            
            if (alert.type === 'incomplete_roster') {
              return (
                <div 
                  key={`roster-${alert.teamId}-${idx}`}
                  className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
                >
                  <div className="flex items-start gap-3">
                    {styles.icon}
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

            return (
              <div 
                key={`tournament-${alert.tournamentId}-${idx}`}
                className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
              >
                <div className="flex items-start gap-3">
                  {styles.icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[hsl(var(--beta-text-primary))]">
                        {alert.tournamentName}
                      </span>
                      {alert.hoursUntilStart !== undefined && (
                        <BetaBadge variant={styles.badge} size="sm">
                          {alert.hoursUntilStart}h
                        </BetaBadge>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(var(--beta-text-secondary))] mt-1">
                      {alert.message}
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
          })}
        </div>
      )}
    </GlassCard>
  );
}
