import { useState, useEffect } from 'react';
import { GlassCard } from "@/components-beta/ui-beta/GlassCard";
import { BetaButton } from "@/components-beta/ui-beta/BetaButton";
import { BetaBadge } from "@/components-beta/ui-beta/BetaBadge";
import { 
  CheckCircle, 
  Circle, 
  User, 
  Trophy, 
  Users, 
  X, 
  ExternalLink,
  ArrowRight 
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface OnboardingChecklistProps {
  completedSteps: string[];
  onStepComplete: (stepId: string) => void;
  onDismiss: () => void;
}

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  checkCondition?: () => Promise<boolean>;
}

const OnboardingChecklist = ({ 
  completedSteps, 
  onStepComplete, 
  onDismiss 
}: OnboardingChecklistProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepStatuses, setStepStatuses] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Track visiting /tournaments to complete the "Find a Tournament" goal
  useEffect(() => {
    if (location.pathname === '/tournaments' && !completedSteps.includes('find_tournament')) {
      onStepComplete('find_tournament');
    }
  }, [location.pathname, completedSteps, onStepComplete]);

  const checklistSteps: ChecklistStep[] = [
    {
      id: 'setup_riot_id',
      title: 'Setup Riot ID',
      description: 'Add your Riot ID for accurate rank tracking and team balancing',
      icon: <User className="w-5 h-5" />,
      action: {
        label: 'Update Profile',
        onClick: () => navigate('/profile')
      },
      checkCondition: async () => {
        if (!user) return false;
        const { data } = await supabase
          .from('users')
          .select('riot_id')
          .eq('id', user.id)
          .single();
        return !!data?.riot_id;
      }
    },
    {
      id: 'find_tournament',
      title: 'Find a Tournament',
      description: 'Browse available tournaments and find one that matches your skill level',
      icon: <Trophy className="w-5 h-5" />,
      action: {
        label: 'Browse Tournaments',
        onClick: () => navigate('/tournaments')
      },
      checkCondition: async () => {
        if (!user) return false;
        return completedSteps.includes('find_tournament') || completedSteps.includes('viewed_tournaments');
      }
    },
    {
      id: 'sign_up_tournament',
      title: 'Sign Up to Tournament',
      description: 'Register for your first tournament - we handle team creation automatically',
      icon: <Users className="w-5 h-5" />,
      checkCondition: async () => {
        if (!user) return false;
        const { data } = await supabase
          .from('tournament_signups')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        return (data?.length || 0) > 0;
      }
    }
  ];

  // Check step completion status
  useEffect(() => {
    const checkStepStatuses = async () => {
      const statuses: Record<string, boolean> = {};
      
      for (const step of checklistSteps) {
        if (completedSteps.includes(step.id)) {
          statuses[step.id] = true;
        } else if (step.checkCondition) {
          statuses[step.id] = await step.checkCondition();
          
          if (statuses[step.id] && !completedSteps.includes(step.id)) {
            onStepComplete(step.id);
          }
        }
      }
      
      setStepStatuses(statuses);
    };

    checkStepStatuses();
  }, [completedSteps, user]);

  const completedCount = Object.values(stepStatuses).filter(Boolean).length;
  const progressPercentage = (completedCount / checklistSteps.length) * 100;

  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <BetaButton
          variant="primary"
          onClick={() => setIsCollapsed(false)}
          className="shadow-[var(--beta-shadow-glow)]"
        >
          Getting Started ({completedCount}/{checklistSteps.length})
        </BetaButton>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full">
      <GlassCard variant="strong" className="shadow-[var(--beta-shadow-lg)] animate-scale-in">
        {/* Header */}
        <div className="flex flex-col gap-3 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[hsl(var(--beta-text-primary))] text-lg font-semibold flex items-center gap-2">
                Getting Started
                <BetaBadge variant="accent">
                  {completedCount}/{checklistSteps.length}
                </BetaBadge>
              </h3>
              <p className="text-[hsl(var(--beta-text-muted))] text-sm mt-1">
                Complete these steps to get the most out of the platform
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setIsCollapsed(true)}
                className="text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] p-2 rounded-[var(--beta-radius-md)] transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onDismiss}
                className="text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] p-2 rounded-[var(--beta-radius-md)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 rounded-full bg-[hsl(var(--beta-surface-4))] overflow-hidden">
            <div
              className="h-full rounded-full bg-[hsl(var(--beta-accent))] transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Steps */}
        <div className="flex flex-col gap-3">
          {checklistSteps.map((step) => {
            const isCompleted = stepStatuses[step.id] || false;
            
            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-[var(--beta-radius-md)] border transition-all ${
                  isCompleted
                    ? 'bg-[hsl(var(--beta-success)/0.1)] border-[hsl(var(--beta-success)/0.3)]'
                    : 'bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-glass-border))] hover:border-[hsl(var(--beta-accent)/0.3)]'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-[hsl(var(--beta-success))]" />
                  ) : (
                    <Circle className="w-5 h-5 text-[hsl(var(--beta-text-muted))]" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={isCompleted ? 'text-[hsl(var(--beta-success))]' : 'text-[hsl(var(--beta-text-secondary))]'}>
                      {step.icon}
                    </span>
                    <h4 className={`text-sm font-medium ${
                      isCompleted ? 'text-[hsl(var(--beta-success))]' : 'text-[hsl(var(--beta-text-primary))]'
                    }`}>
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1 leading-relaxed">
                    {step.description}
                  </p>
                  
                  {!isCompleted && step.action && (
                    <button
                      onClick={step.action.onClick}
                      className="text-[hsl(var(--beta-accent))] hover:text-[hsl(var(--beta-accent-glow))] text-xs mt-2 inline-flex items-center gap-1 transition-colors"
                    >
                      {step.action.label}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {completedCount === checklistSteps.length && (
            <div className="text-center py-4">
              <div className="text-[hsl(var(--beta-success))] text-lg font-medium mb-2">
                🎉 All set!
              </div>
              <p className="text-[hsl(var(--beta-text-muted))] text-sm mb-3">
                You're ready to compete in tournaments!
              </p>
              <BetaButton
                variant="primary"
                onClick={onDismiss}
                className="w-full"
              >
                Get Started
              </BetaButton>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default OnboardingChecklist;
