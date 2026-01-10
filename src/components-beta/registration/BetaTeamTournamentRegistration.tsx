import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BetaButton } from '@/components-beta/ui-beta';
import { Users, UserPlus, CheckCircle2, XCircle, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BetaTeamTournamentRegistrationProps {
  tournamentId: string;
  maxTeams: number;
  currentTeamCount: number;
  registrationOpen: boolean;
  onRegistrationChange: () => void;
}

interface UserTeam {
  id: string;
  name: string;
  captain_id: string;
  owner_id: string | null;
  member_count: number;
}

export function BetaTeamTournamentRegistration({
  tournamentId,
  maxTeams,
  currentTeamCount,
  registrationOpen,
  onRegistrationChange,
}: BetaTeamTournamentRegistrationProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCaptainOrOwner, setIsCaptainOrOwner] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserTeamAndRegistration();
    } else {
      setLoading(false);
    }
  }, [user, tournamentId]);

  const fetchUserTeamAndRegistration = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user's persistent team membership
      const { data: membership, error: membershipError } = await supabase
        .from('persistent_team_members')
        .select(`
          team_id,
          role,
          is_captain,
          persistent_teams!inner (
            id,
            name,
            captain_id,
            owner_id,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) {
        console.error('Error fetching team membership:', membershipError);
        setLoading(false);
        return;
      }

      if (!membership || !membership.persistent_teams) {
        setUserTeam(null);
        setLoading(false);
        return;
      }

      const team = membership.persistent_teams as {
        id: string;
        name: string;
        captain_id: string;
        owner_id: string | null;
        is_active: boolean;
      };

      if (!team.is_active) {
        setUserTeam(null);
        setLoading(false);
        return;
      }

      // Get member count
      const { count: memberCount } = await supabase
        .from('persistent_team_members')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id);

      setUserTeam({
        id: team.id,
        name: team.name,
        captain_id: team.captain_id,
        owner_id: team.owner_id,
        member_count: memberCount || 0,
      });

      // Check if user is captain or owner
      const isOwnerOrCaptain = 
        team.captain_id === user.id || 
        team.owner_id === user.id ||
        membership.role === 'owner' ||
        membership.is_captain === true;
      setIsCaptainOrOwner(isOwnerOrCaptain);

      // Check if team is already registered
      const { data: registration, error: regError } = await supabase
        .from('team_tournament_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('team_id', team.id)
        .maybeSingle();

      if (regError) {
        console.error('Error checking registration:', regError);
      }

      setIsRegistered(!!registration);
    } catch (error) {
      console.error('Error in fetchUserTeamAndRegistration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user || !userTeam) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('team_tournament_registrations')
        .insert({
          tournament_id: tournamentId,
          team_id: userTeam.id,
          status: 'registered',
          check_in_status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Team is already registered for this tournament');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`${userTeam.name} registered successfully!`);
      setIsRegistered(true);
      onRegistrationChange();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnregister = async () => {
    if (!user || !userTeam) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('team_tournament_registrations')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('team_id', userTeam.id);

      if (error) throw error;

      toast.success('Team unregistered from tournament');
      setIsRegistered(false);
      onRegistrationChange();
    } catch (error) {
      console.error('Unregistration error:', error);
      toast.error('Failed to unregister team');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--beta-text-muted))]" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="text-center">
        <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-3">
          Sign in to register your team
        </p>
        <BetaButton variant="primary" onClick={() => navigate('/login')}>
          Sign In
        </BetaButton>
      </div>
    );
  }

  // No team
  if (!userTeam) {
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[hsl(var(--beta-surface-4))] p-2">
          <Users className="h-4 w-4 text-[hsl(var(--beta-text-muted))]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">No Team Found</p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">
            Join or create a team first
          </p>
        </div>
        <BetaButton 
          variant="secondary" 
          size="sm"
          onClick={() => navigate('/beta/my-team')}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Manage Team
        </BetaButton>
      </div>
    );
  }

  // Has team but not captain/owner
  if (!isCaptainOrOwner) {
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[hsl(var(--beta-surface-4))] p-2">
          <Shield className="h-4 w-4 text-[hsl(var(--beta-text-muted))]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">{userTeam.name}</p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">
            Only team captains can register
          </p>
        </div>
        {isRegistered && (
          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--beta-success))]">
            <CheckCircle2 className="h-4 w-4" />
            <span>Registered</span>
          </div>
        )}
      </div>
    );
  }

  // Registration full
  const isFull = currentTeamCount >= maxTeams;

  // Team is registered
  if (isRegistered) {
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[hsl(var(--beta-success)/0.2)] p-2">
          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--beta-success))]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[hsl(var(--beta-success))]">Registered</p>
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">
            {userTeam.name} is signed up
          </p>
        </div>
        {registrationOpen && (
          <BetaButton 
            variant="ghost" 
            size="sm" 
            className="text-[hsl(var(--beta-error))] hover:text-[hsl(var(--beta-error))] hover:bg-[hsl(var(--beta-error)/0.1)]"
            onClick={handleUnregister}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Unregister
              </>
            )}
          </BetaButton>
        )}
      </div>
    );
  }

  // Can register
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-full bg-[hsl(var(--beta-surface-4))] p-2">
        <Users className="h-4 w-4 text-[hsl(var(--beta-text-primary))]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">{userTeam.name}</p>
        <p className="text-xs text-[hsl(var(--beta-text-muted))]">
          {userTeam.member_count} member{userTeam.member_count !== 1 ? 's' : ''}
        </p>
      </div>
      {!registrationOpen ? (
        <span className="text-xs text-[hsl(var(--beta-text-muted))]">Closed</span>
      ) : isFull ? (
        <span className="text-xs text-[hsl(var(--beta-error))]">Full</span>
      ) : (
        <BetaButton 
          variant="primary" 
          size="sm"
          onClick={handleRegister}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Register Team
            </>
          )}
        </BetaButton>
      )}
    </div>
  );
}
