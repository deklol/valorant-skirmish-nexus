import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { useNavigate } from 'react-router-dom';

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
  const [stepStatuses, setStepStatuses] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        // Check if user has viewed tournaments page (we'll track this)
        return completedSteps.includes('viewed_tournaments');
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
          
          // Auto-complete step if condition is met
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
        <Button
          onClick={() => setIsCollapsed(false)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
        >
          Getting Started ({completedCount}/{checklistSteps.length})
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full">
      <Card className="bg-slate-800 border-slate-600 shadow-xl animate-scale-in">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                Getting Started
                <Badge variant="secondary" className="bg-red-600/20 text-red-400">
                  {completedCount}/{checklistSteps.length}
                </Badge>
              </CardTitle>
              <p className="text-slate-400 text-sm mt-1">
                Complete these steps to get the most out of the platform
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(true)}
                className="text-slate-400 hover:text-white p-2"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-slate-400 hover:text-white p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-2 mt-3"
          />
        </CardHeader>
        
        <CardContent className="space-y-3">
          {checklistSteps.map((step) => {
            const isCompleted = stepStatuses[step.id] || false;
            
            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  isCompleted
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {step.icon}
                    <h4 className={`text-sm font-medium ${
                      isCompleted ? 'text-green-400' : 'text-white'
                    }`}>
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                  
                  {!isCompleted && step.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={step.action.onClick}
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto mt-2 text-xs"
                    >
                      {step.action.label}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          
          {completedCount === checklistSteps.length && (
            <div className="text-center py-4">
              <div className="text-green-400 text-lg font-medium mb-2">
                🎉 All set!
              </div>
              <p className="text-slate-400 text-sm mb-3">
                You're ready to compete in tournaments!
              </p>
              <Button
                onClick={onDismiss}
                className="bg-red-600 hover:bg-red-700 text-white w-full"
              >
                Get Started
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingChecklist;