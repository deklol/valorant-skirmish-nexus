import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BetaButton } from "@/components-beta/ui-beta/BetaButton";
import { BetaBadge } from "@/components-beta/ui-beta/BetaBadge";
import { BetaCard, BetaCardContent } from "@/components-beta/ui-beta/BetaCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Trophy, 
  GamepadIcon, 
  ChevronRight, 
  Calendar,
  Users,
  SkipForward,
  X
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface OnboardingModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  max_players: number;
  tournament_signups: { count: number }[];
}

const OnboardingModal = ({ onComplete, onSkip }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [riotId, setRiotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to The Last Resort!',
      description: 'Get ready to compete in competitive Valorant tournaments. Let\'s get you set up in just a few steps.',
      icon: <GamepadIcon className="w-8 h-8 text-[hsl(var(--beta-accent))]" />
    },
    {
      id: 'riot-id',
      title: 'Set Up Your Riot ID',
      description: 'We need your Riot ID to track your rank and create balanced teams. This helps ensure fair and competitive matches.',
      icon: <User className="w-8 h-8 text-[hsl(var(--beta-accent-muted))]" />
    },
    {
      id: 'tournaments',
      title: 'Join Your First Tournament',
      description: 'Browse available tournaments and sign up for your first competition. We handle team creation automatically based on skill levels.',
      icon: <Trophy className="w-8 h-8 text-[hsl(var(--beta-accent-glow))]" />
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select(`
            id,
            name,
            start_time,
            max_players,
            tournament_signups(count)
          `)
          .eq('status', 'open')
          .order('start_time', { ascending: true })
          .limit(3);

        if (error) throw error;
        setTournaments(data || []);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoadingTournaments(false);
      }
    };

    if (currentStep === 2) {
      fetchTournaments();
    }
  }, [currentStep]);

  const validateRiotId = (id: string) => {
    const riotIdPattern = /^.+#[A-Za-z0-9]{3,5}$/;
    return riotIdPattern.test(id);
  };

  const handleRiotIdSubmit = async () => {
    if (!validateRiotId(riotId)) {
      toast({
        title: "Invalid Riot ID",
        description: "Please enter a valid Riot ID (e.g., PlayerName#1234)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          riot_id: riotId,
          discord_id: user?.user_metadata?.provider_id,
          discord_username: user?.user_metadata?.full_name,
          riot_id_last_updated: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      const shouldScrapeRank = !profile?.current_rank || !profile?.peak_rank;
      
      if (shouldScrapeRank) {
        try {
          await supabase.functions.invoke('scrape-rank', {
            body: { riot_id: riotId, user_id: user?.id }
          });
        } catch (scrapeError) {
          console.error('Rank scraping failed:', scrapeError);
        }
      }

      await refreshProfile();
      
      toast({
        title: "Riot ID Saved!",
        description: "Your profile has been updated successfully.",
      });

      setCurrentStep(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      handleRiotIdSubmit();
    } else if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onSkip();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center flex flex-col gap-4">
            <div className="mx-auto w-16 h-16 bg-[hsl(var(--beta-accent-subtle))] rounded-full flex items-center justify-center">
              {currentStepData.icon}
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Ready to compete?</h3>
              <p className="text-[hsl(var(--beta-text-muted))] text-sm">
                Join balanced, competitive Valorant tournaments with players at your skill level.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div className="mx-auto w-16 h-16 bg-[hsl(var(--beta-accent-subtle))] rounded-full flex items-center justify-center mb-3">
                {currentStepData.icon}
              </div>
              <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">Enter Your Riot ID</h3>
              <p className="text-[hsl(var(--beta-text-muted))] text-sm">
                This helps us track your rank and create balanced teams
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Label htmlFor="riotId" className="text-[hsl(var(--beta-text-secondary))]">
                Riot ID (e.g., PlayerName#1234)
              </Label>
              <Input
                id="riotId"
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                placeholder="Enter your Riot ID"
                className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))]"
                required
              />
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                Your Riot ID includes your username and tag (e.g., TestUser#ABC12)
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div className="mx-auto w-16 h-16 bg-[hsl(var(--beta-accent-subtle))] rounded-full flex items-center justify-center mb-3">
                {currentStepData.icon}
              </div>
              <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">Available Tournaments</h3>
              <p className="text-[hsl(var(--beta-text-muted))] text-sm">
                Here are some upcoming tournaments you can join
              </p>
            </div>

            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
              {loadingTournaments ? (
                <div className="text-center py-8">
                  <div className="text-[hsl(var(--beta-text-muted))]">Loading tournaments...</div>
                </div>
              ) : tournaments.length > 0 ? (
                tournaments.map((tournament) => {
                  const signupCount = tournament.tournament_signups[0]?.count || 0;
                  const spotsLeft = tournament.max_players - signupCount;
                  
                  return (
                    <BetaCard
                      key={tournament.id}
                      className="cursor-pointer hover:border-[hsl(var(--beta-accent)/0.3)] transition-colors"
                      onClick={() => navigate(`/tournament/${tournament.id}`)}
                    >
                      <BetaCardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-[hsl(var(--beta-text-primary))] mb-1">{tournament.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-[hsl(var(--beta-text-muted))]">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(tournament.start_time).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {signupCount}/{tournament.max_players}
                              </div>
                            </div>
                          </div>
                          <BetaBadge variant={spotsLeft > 0 ? "success" : "error"}>
                            {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
                          </BetaBadge>
                        </div>
                      </BetaCardContent>
                    </BetaCard>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <div className="text-[hsl(var(--beta-text-muted))] mb-2">No tournaments available right now</div>
                  <p className="text-sm text-[hsl(var(--beta-text-muted))]">Check back later for new tournaments!</p>
                </div>
              )}
            </div>

            {tournaments.length > 0 && (
              <div className="text-center pt-2">
                <BetaButton
                  variant="outline"
                  onClick={() => navigate('/tournaments')}
                >
                  View All Tournaments
                </BetaButton>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg bg-[hsl(var(--beta-surface-2))] border-[hsl(var(--beta-glass-border))]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-[hsl(var(--beta-text-primary))] text-xl">{currentStepData.title}</DialogTitle>
              <DialogDescription className="text-[hsl(var(--beta-text-secondary))] mt-1">
                {currentStepData.description}
              </DialogDescription>
            </div>
            <div className="flex gap-1">
              <button
                onClick={onSkip}
                className="text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] p-2 rounded-[var(--beta-radius-md)] transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={onSkip}
                className="text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] p-2 rounded-[var(--beta-radius-md)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <BetaBadge variant="accent">
              Step {currentStep + 1} of {steps.length}
            </BetaBadge>
            <div className="flex-1 h-2 rounded-full bg-[hsl(var(--beta-surface-4))] overflow-hidden">
              <div
                className="h-full rounded-full bg-[hsl(var(--beta-accent))] transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[hsl(var(--beta-glass-border))]">
          <BetaButton
            variant="secondary"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0}
          >
            Previous
          </BetaButton>

          <div className="flex gap-2">
            {currentStep === 1 && (
              <BetaButton
                variant="ghost"
                onClick={handleSkip}
              >
                Skip for now
              </BetaButton>
            )}
            
            <BetaButton
              variant="primary"
              onClick={handleNext}
              disabled={loading || (currentStep === 1 && !riotId)}
              isLoading={loading}
            >
              {loading ? 'Saving...' : isLastStep ? 'Get Started!' : 'Next'}
              {!isLastStep && !loading && <ChevronRight className="w-4 h-4 ml-1" />}
            </BetaButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
