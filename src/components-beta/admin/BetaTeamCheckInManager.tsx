import { useState, useEffect } from "react";
import { GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { 
  CheckCircle, XCircle, Clock, Users, UserCheck, AlertTriangle,
  RefreshCw, CheckCheck, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface CheckInRegistration {
  id: string;
  team_id: string;
  check_in_status: 'pending' | 'checked_in' | 'no_show';
  checked_in_at: string | null;
  seed: number | null;
  team: {
    id: string;
    name: string;
    total_rank_points: number;
  };
}

interface BetaTeamCheckInManagerProps {
  tournamentId: string;
  checkInDeadline?: string;
  onCheckInComplete?: () => void;
}

export const BetaTeamCheckInManager = ({ 
  tournamentId, 
  checkInDeadline,
  onCheckInComplete 
}: BetaTeamCheckInManagerProps) => {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<CheckInRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrations();
    
    // Set up realtime subscription
    const channel = supabase
      .channel(`check-in:${tournamentId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'team_tournament_registrations',
        filter: `tournament_id=eq.${tournamentId}`
      }, fetchRegistrations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('team_tournament_registrations')
        .select(`
          id,
          team_id,
          check_in_status,
          checked_in_at,
          seed,
          persistent_teams!inner (
            id,
            name,
            total_rank_points
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'registered')
        .order('seed', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const mapped = (data || []).map(r => ({
        id: r.id,
        team_id: r.team_id,
        check_in_status: (r.check_in_status || 'pending') as CheckInRegistration['check_in_status'],
        checked_in_at: r.checked_in_at,
        seed: r.seed,
        team: {
          id: r.persistent_teams.id,
          name: r.persistent_teams.name,
          total_rank_points: r.persistent_teams.total_rank_points || 0,
        },
      }));

      setRegistrations(mapped);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceCheckIn = async (registrationId: string, teamId: string) => {
    setProcessing(registrationId);
    try {
      const { data, error } = await supabase.rpc('admin_force_check_in', {
        p_tournament_id: tournamentId,
        p_team_id: teamId,
      });

      if (error) throw error;
      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success) throw new Error(result?.error || 'Unknown error');

      toast({ title: "Checked in!", description: "Team has been checked in" });
      await fetchRegistrations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkNoShow = async (registrationId: string, teamId: string) => {
    setProcessing(registrationId);
    try {
      const { data, error } = await supabase.rpc('mark_team_no_show', {
        p_tournament_id: tournamentId,
        p_team_id: teamId,
      });

      if (error) throw error;
      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success) throw new Error(result?.error || 'Unknown error');

      toast({ title: "Marked as no-show", description: "Team has been marked as no-show" });
      await fetchRegistrations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkCheckIn = async () => {
    const pending = registrations.filter(r => r.check_in_status === 'pending');
    if (pending.length === 0) return;

    setProcessing('bulk');
    try {
      for (const reg of pending) {
        await supabase.rpc('admin_force_check_in', {
          p_tournament_id: tournamentId,
          p_team_id: reg.team_id,
        });
      }

      toast({ title: "All teams checked in!", description: `${pending.length} teams checked in` });
      await fetchRegistrations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkNoShow = async () => {
    const pending = registrations.filter(r => r.check_in_status === 'pending');
    if (pending.length === 0) return;

    setProcessing('bulk');
    try {
      for (const reg of pending) {
        await supabase.rpc('mark_team_no_show', {
          p_tournament_id: tournamentId,
          p_team_id: reg.team_id,
        });
      }

      toast({ title: "Teams marked as no-show", description: `${pending.length} teams marked` });
      await fetchRegistrations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: CheckInRegistration['check_in_status']) => {
    switch (status) {
      case 'checked_in':
        return <BetaBadge variant="success" size="sm"><CheckCircle className="w-3 h-3 mr-1" />Checked In</BetaBadge>;
      case 'no_show':
        return <BetaBadge variant="error" size="sm"><XCircle className="w-3 h-3 mr-1" />No Show</BetaBadge>;
      default:
        return <BetaBadge variant="warning" size="sm"><Clock className="w-3 h-3 mr-1" />Pending</BetaBadge>;
    }
  };

  const stats = {
    total: registrations.length,
    checkedIn: registrations.filter(r => r.check_in_status === 'checked_in').length,
    pending: registrations.filter(r => r.check_in_status === 'pending').length,
    noShow: registrations.filter(r => r.check_in_status === 'no_show').length,
  };

  if (loading) {
    return (
      <GlassCard className="p-8">
        <div className="flex items-center justify-center">
          <UserCheck className="w-8 h-8 text-[hsl(var(--beta-accent))] animate-pulse" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">Team Check-In</h3>
          {checkInDeadline && (
            <p className="text-sm text-[hsl(var(--beta-text-muted))]">
              Deadline: {formatDistanceToNow(new Date(checkInDeadline), { addSuffix: true })}
            </p>
          )}
        </div>
        <BetaButton variant="ghost" size="sm" onClick={fetchRegistrations}>
          <RefreshCw className="w-4 h-4" />
        </BetaButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-3))] text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-[hsl(var(--beta-text-muted))]" />
          <p className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">{stats.total}</p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">Total</p>
        </div>
        <div className="p-3 rounded-lg bg-[hsl(var(--beta-success)/0.1)] text-center">
          <CheckCircle className="w-5 h-5 mx-auto mb-1 text-[hsl(var(--beta-success))]" />
          <p className="text-xl font-bold text-[hsl(var(--beta-success))]">{stats.checkedIn}</p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">Checked In</p>
        </div>
        <div className="p-3 rounded-lg bg-[hsl(var(--beta-warning)/0.1)] text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-[hsl(var(--beta-warning))]" />
          <p className="text-xl font-bold text-[hsl(var(--beta-warning))]">{stats.pending}</p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">Pending</p>
        </div>
        <div className="p-3 rounded-lg bg-[hsl(var(--beta-error)/0.1)] text-center">
          <XCircle className="w-5 h-5 mx-auto mb-1 text-[hsl(var(--beta-error))]" />
          <p className="text-xl font-bold text-[hsl(var(--beta-error))]">{stats.noShow}</p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">No Show</p>
        </div>
      </div>

      {/* Bulk Actions */}
      {stats.pending > 0 && (
        <div className="flex gap-2 mb-6">
          <BetaButton 
            variant="secondary" 
            size="sm" 
            onClick={handleBulkCheckIn}
            disabled={processing === 'bulk'}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Check In All Pending ({stats.pending})
          </BetaButton>
          <BetaButton 
            variant="ghost" 
            size="sm" 
            onClick={handleBulkNoShow}
            disabled={processing === 'bulk'}
            className="text-[hsl(var(--beta-error))]"
          >
            <X className="w-4 h-4 mr-1" />
            Mark All No-Show
          </BetaButton>
        </div>
      )}

      {/* Team List */}
      <div className="space-y-2">
        {registrations.map((reg) => (
          <div
            key={reg.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              reg.check_in_status === 'checked_in' 
                ? 'bg-[hsl(var(--beta-success)/0.05)] border-[hsl(var(--beta-success)/0.2)]'
                : reg.check_in_status === 'no_show'
                ? 'bg-[hsl(var(--beta-error)/0.05)] border-[hsl(var(--beta-error)/0.2)]'
                : 'bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]'
            }`}
          >
            <div className="flex items-center gap-3">
              {reg.seed && (
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[hsl(var(--beta-surface-4))] text-sm font-bold text-[hsl(var(--beta-text-muted))]">
                  #{reg.seed}
                </span>
              )}
              <div>
                <p className="font-medium text-[hsl(var(--beta-text-primary))]">{reg.team.name}</p>
                {reg.checked_in_at && (
                  <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                    Checked in {format(new Date(reg.checked_in_at), 'HH:mm')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getStatusBadge(reg.check_in_status)}
              
              {reg.check_in_status === 'pending' && (
                <div className="flex gap-1">
                  <BetaButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleForceCheckIn(reg.id, reg.team_id)}
                    disabled={processing === reg.id}
                    className="text-[hsl(var(--beta-success))]"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </BetaButton>
                  <BetaButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkNoShow(reg.id, reg.team_id)}
                    disabled={processing === reg.id}
                    className="text-[hsl(var(--beta-error))]"
                  >
                    <XCircle className="w-4 h-4" />
                  </BetaButton>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {registrations.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
          <p className="text-[hsl(var(--beta-text-muted))]">No teams registered yet</p>
        </div>
      )}
    </GlassCard>
  );
};

export default BetaTeamCheckInManager;
