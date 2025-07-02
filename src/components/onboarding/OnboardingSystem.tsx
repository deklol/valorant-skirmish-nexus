import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import TutorialOverlay from './TutorialOverlay';
import OnboardingChecklist from './OnboardingChecklist';
import { useToast } from '@/hooks/use-toast';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  action?: () => void;
  condition?: () => boolean;
}

interface OnboardingSystemProps {
  children: React.ReactNode;
}

const OnboardingSystem = ({ children }: OnboardingSystemProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);

  // Define tutorial steps
  const tutorialSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to The Last Resort!',
      description: 'Let\'s take a quick tour of the platform to get you started with competitive gaming.',
      target: '.tournament-section'
    },
    {
      id: 'find-tournaments',
      title: 'Find Tournaments',
      description: 'Browse active and upcoming tournaments. You can filter by skill level, format, and more.',
      target: '[data-tour="tournaments"]'
    },
    {
      id: 'signup-process',
      title: 'Easy Sign-up',
      description: 'Joining tournaments is simple - just click to register and we\'ll handle team balancing automatically.',
      target: '[data-tour="tournament-card"]'
    },
    {
      id: 'player-profile',
      title: 'Your Profile',
      description: 'Keep your Riot ID updated for accurate rank tracking and better team balancing.',
      target: '[data-tour="profile"]'
    }
  ];

  // Check if user is new and load their progress
  useEffect(() => {
    if (!user) return;

    // Listen for admin preview events
    const handlePreviewTutorial = () => {
      setCurrentStep(0);
      setShowTutorial(true);
    };

    const handlePreviewChecklist = () => {
      setShowChecklist(true);
    };

    window.addEventListener('preview-tutorial', handlePreviewTutorial);
    window.addEventListener('preview-checklist', handlePreviewChecklist);

    const checkOnboardingStatus = async () => {
      try {
        // Check if user has completed onboarding
        const { data: progress } = await supabase
          .from('user_onboarding_progress')
          .select('step_id')
          .eq('user_id', user.id);

        const completed = progress?.map(p => p.step_id) || [];
        setCompletedSteps(completed);

        // Check if user is new (created within last 24 hours and no progress)
        const { data: userData } = await supabase
          .from('users')
          .select('created_at')
          .eq('id', user.id)
          .single();

        if (userData) {
          const createdAt = new Date(userData.created_at);
          const now = new Date();
          const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          
          const isNewUserCheck = hoursSinceCreation < 24 && completed.length === 0;
          setIsNewUser(isNewUserCheck);

          // Show tutorial for new users automatically
          if (isNewUserCheck && !completed.includes('tutorial_completed')) {
            setShowTutorial(true);
          }

          // Show checklist if user has started but not completed onboarding
          if (completed.length > 0 && completed.length < 3) {
            setShowChecklist(true);
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();

    return () => {
      window.removeEventListener('preview-tutorial', handlePreviewTutorial);
      window.removeEventListener('preview-checklist', handlePreviewChecklist);
    };
  }, [user]);

  const completeStep = async (stepId: string) => {
    if (!user) return;

    try {
      await supabase.rpc('update_onboarding_progress', {
        p_user_id: user.id,
        p_step_id: stepId,
        p_metadata: { completed_at: new Date().toISOString() }
      });

      setCompletedSteps(prev => [...prev, stepId]);

      // Show success toast
      toast({
        title: "Progress Saved!",
        description: "Your onboarding progress has been updated.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error completing onboarding step:', error);
    }
  };

  const handleTutorialComplete = async () => {
    await completeStep('tutorial_completed');
    setShowTutorial(false);
    setShowChecklist(true);
  };

  const handleSkipTutorial = async () => {
    await completeStep('tutorial_skipped');
    setShowTutorial(false);
    setShowChecklist(true);
  };

  const handleChecklistDismiss = async () => {
    await completeStep('checklist_dismissed');
    setShowChecklist(false);
  };

  return (
    <div className="relative">
      {children}
      
      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay
          steps={tutorialSteps}
          currentStep={currentStep}
          onNext={() => setCurrentStep(prev => prev + 1)}
          onPrevious={() => setCurrentStep(prev => prev - 1)}
          onComplete={handleTutorialComplete}
          onSkip={handleSkipTutorial}
        />
      )}

      {/* Onboarding Checklist */}
      {showChecklist && (
        <OnboardingChecklist
          completedSteps={completedSteps}
          onStepComplete={completeStep}
          onDismiss={handleChecklistDismiss}
        />
      )}
    </div>
  );
};

export default OnboardingSystem;