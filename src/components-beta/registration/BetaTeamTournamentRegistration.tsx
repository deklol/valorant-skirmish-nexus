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
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="rounded-lg border border-border/50 bg-card/50 p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
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
      <div className="rounded-lg border border-border/50 bg-card/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-muted/50 p-2">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">No Team Found</p>
            <p className="text-xs text-muted-foreground mt-1">
              You need to join or create a team to register for team tournaments.
            </p>
            <BetaButton 
              variant="secondary" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/beta/my-team')}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Manage Team
            </BetaButton>
          </div>
        </div>
      </div>
    );
  }

  // Has team but not captain/owner
  if (!isCaptainOrOwner) {
    return (
      <div className="rounded-lg border border-border/50 bg-card/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-muted/50 p-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{userTeam.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Only team captains or owners can register for tournaments.
            </p>
            {isRegistered && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Team is registered</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Registration full
  const isFull = currentTeamCount >= maxTeams;

  // Team is registered
  if (isRegistered) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/20 p-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">Registered</p>
            <p className="text-xs text-muted-foreground mt-1">
              {userTeam.name} is registered for this tournament.
            </p>
            {registrationOpen && (
              <BetaButton 
                variant="ghost" 
                size="sm" 
                className="mt-3 text-destructive hover:text-destructive"
                onClick={handleUnregister}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                )}
                Unregister Team
              </BetaButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Can register
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-muted/50 p-2">
          <Users className="h-4 w-4 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{userTeam.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {userTeam.member_count} member{userTeam.member_count !== 1 ? 's' : ''}
          </p>
          {!registrationOpen ? (
            <p className="text-xs text-muted-foreground mt-2">
              Registration is currently closed.
            </p>
          ) : isFull ? (
            <p className="text-xs text-destructive mt-2">
              Tournament is full ({currentTeamCount}/{maxTeams} teams)
            </p>
          ) : (
            <BetaButton 
              variant="primary" 
              size="sm" 
              className="mt-3"
              onClick={handleRegister}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Register Team
            </BetaButton>
          )}
        </div>
      </div>
    </div>
  );
}
