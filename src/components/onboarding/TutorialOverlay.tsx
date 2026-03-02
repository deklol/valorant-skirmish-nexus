import { useState, useEffect } from 'react';
import { BetaButton } from "@/components-beta/ui-beta/BetaButton";
import { BetaBadge } from "@/components-beta/ui-beta/BetaBadge";
import { GlassCard } from "@/components-beta/ui-beta/GlassCard";
import { X, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { OnboardingStep } from './OnboardingSystem';

interface TutorialOverlayProps {
  steps: OnboardingStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

const TutorialOverlay = ({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onComplete,
  onSkip
}: TutorialOverlayProps) => {
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const step = steps[currentStep];

  useEffect(() => {
    if (step?.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      onComplete();
    } else {
      onNext();
    }
  };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black/70 z-50 pointer-events-auto" />
      
      {/* Highlight Element */}
      {highlightRect && (
        <div
          className="fixed z-[51] pointer-events-none"
          style={{
            left: highlightRect.left - 4,
            top: highlightRect.top - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            boxShadow: '0 0 0 4px hsl(38 92% 50% / 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.7)',
            borderRadius: 'var(--beta-radius-lg, 12px)'
          }}
        />
      )}

      {/* Tutorial Card */}
      <div className="fixed inset-4 z-[52] flex items-center justify-center pointer-events-none">
        <GlassCard variant="strong" className="max-w-md w-full mx-4 pointer-events-auto animate-scale-in">
          {/* Header */}
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BetaBadge variant="accent">
                  Step {currentStep + 1} of {steps.length}
                </BetaBadge>
                <button
                  onClick={onSkip}
                  className="text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] p-2 rounded-[var(--beta-radius-md)] transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={onSkip}
                className="text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] p-2 rounded-[var(--beta-radius-md)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-[hsl(var(--beta-text-primary))] text-lg font-semibold">
              {step.title}
            </h3>
          </div>
          
          {/* Content */}
          <div className="flex flex-col gap-5">
            <p className="text-[hsl(var(--beta-text-secondary))] leading-relaxed">
              {step.description}
            </p>

            {/* Progress Indicator */}
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    index <= currentStep 
                      ? 'bg-[hsl(var(--beta-accent))]' 
                      : 'bg-[hsl(var(--beta-surface-4))]'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3">
              <BetaButton
                variant="secondary"
                onClick={onPrevious}
                disabled={isFirstStep}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </BetaButton>

              <div className="flex gap-2">
                <BetaButton
                  variant="ghost"
                  onClick={onSkip}
                >
                  Skip Tour
                </BetaButton>
                
                <BetaButton
                  variant="primary"
                  onClick={handleNext}
                >
                  {isLastStep ? 'Complete' : 'Next'}
                  {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
                </BetaButton>
              </div>
            </div>

            {/* Action Button (if step has one) */}
            {step.action && (
              <BetaButton
                onClick={step.action}
                variant="outline"
                className="w-full"
              >
                Try it yourself
              </BetaButton>
            )}
          </div>
        </GlassCard>
      </div>
    </>
  );
};

export default TutorialOverlay;
