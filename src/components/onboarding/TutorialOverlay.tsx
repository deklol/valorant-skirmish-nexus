import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        
        // Scroll element into view
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
            boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.7)',
            borderRadius: '8px'
          }}
        />
      )}

      {/* Tutorial Card */}
      <div className="fixed inset-4 z-[52] flex items-center justify-center pointer-events-none">
        <Card className="bg-slate-800 border-slate-600 max-w-md w-full mx-4 pointer-events-auto animate-scale-in">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-red-600/20 text-red-400">
                  Step {currentStep + 1} of {steps.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-slate-400 hover:text-white p-2"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-slate-400 hover:text-white p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardTitle className="text-white text-lg">
              {step.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <p className="text-slate-300 leading-relaxed">
              {step.description}
            </p>

            {/* Progress Indicator */}
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    index <= currentStep 
                      ? 'bg-red-500' 
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={isFirstStep}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={onSkip}
                  className="text-slate-400 hover:text-white"
                >
                  Skip Tour
                </Button>
                
                <Button
                  onClick={handleNext}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLastStep ? 'Complete' : 'Next'}
                  {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>

            {/* Action Button (if step has one) */}
            {step.action && (
              <Button
                onClick={step.action}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Try it yourself
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default TutorialOverlay;