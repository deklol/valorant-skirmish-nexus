import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
      icon: <GamepadIcon className="w-8 h-8 text-red-400" />
    },
    {
      id: 'riot-id',
      title: 'Set Up Your Riot ID',
      description: 'We need your Riot ID to track your rank and create balanced teams. This helps ensure fair and competitive matches.',
      icon: <User className="w-8 h-8 text-blue-400" />
    },
    {
      id: 'tournaments',
      title: 'Join Your First Tournament',
      description: 'Browse available tournaments and sign up for your first competition. We handle team creation automatically based on skill levels.',
      icon: <Trophy className="w-8 h-8 text-yellow-400" />
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

      // Try to scrape rank data
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
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
              {currentStepData.icon}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Ready to compete?</h3>
              <p className="text-slate-400 text-sm">
                Join balanced, competitive Valorant tournaments with players at your skill level.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="mx-auto w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-3">
                {currentStepData.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Enter Your Riot ID</h3>
              <p className="text-slate-400 text-sm">
                This helps us track your rank and create balanced teams
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="riotId" className="text-slate-200">
                Riot ID (e.g., PlayerName#1234)
              </Label>
              <Input
                id="riotId"
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                placeholder="Enter your Riot ID"
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
              <p className="text-xs text-slate-400">
                Your Riot ID includes your username and tag (e.g., TestUser#ABC12)
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="mx-auto w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mb-3">
                {currentStepData.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Available Tournaments</h3>
              <p className="text-slate-400 text-sm">
                Here are some upcoming tournaments you can join
              </p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {loadingTournaments ? (
                <div className="text-center py-8">
                  <div className="text-slate-400">Loading tournaments...</div>
                </div>
              ) : tournaments.length > 0 ? (
                tournaments.map((tournament) => {
                  const signupCount = tournament.tournament_signups[0]?.count || 0;
                  const spotsLeft = tournament.max_players - signupCount;
                  
                  return (
                    <Card key={tournament.id} className="bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 transition-colors cursor-pointer"
                          onClick={() => navigate(`/tournament/${tournament.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-white mb-1">{tournament.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
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
                          <Badge 
                            variant={spotsLeft > 0 ? "default" : "destructive"} 
                            className={spotsLeft > 0 ? "bg-green-600/20 text-green-400" : ""}
                          >
                            {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <div className="text-slate-400 mb-2">No tournaments available right now</div>
                  <p className="text-sm text-slate-500">Check back later for new tournaments!</p>
                </div>
              )}
            </div>

            {tournaments.length > 0 && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/tournaments')}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  View All Tournaments
                </Button>
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
      <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white text-xl">{currentStepData.title}</DialogTitle>
              <DialogDescription className="text-slate-300 mt-1">
                {currentStepData.description}
              </DialogDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-slate-400 hover:text-white p-2"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-slate-400 hover:text-white p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Badge variant="secondary" className="bg-red-600/20 text-red-400">
              Step {currentStep + 1} of {steps.length}
            </Badge>
            <Progress value={progressPercentage} className="flex-1 h-2" />
          </div>
        </DialogHeader>

        <div className="py-6">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep === 1 && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-slate-400 hover:text-white"
              >
                Skip for now
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              disabled={loading || (currentStep === 1 && !riotId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Saving...' : isLastStep ? 'Get Started!' : 'Next'}
              {!isLastStep && !loading && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;