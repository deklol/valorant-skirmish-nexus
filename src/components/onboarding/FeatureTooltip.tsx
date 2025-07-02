import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, HelpCircle } from "lucide-react";
import { useAnalytics } from '@/hooks/useAnalytics';

interface FeatureTooltipProps {
  feature: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'auto';
  showOnFirstVisit?: boolean;
  children: React.ReactNode;
}

const FeatureTooltip = ({
  feature,
  title,
  description,
  position = 'top',
  trigger = 'hover',
  showOnFirstVisit = true,
  children
}: FeatureTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Check if user has seen this tooltip before
    const seenKey = `tooltip_seen_${feature}`;
    const seen = localStorage.getItem(seenKey);
    
    if (!seen && showOnFirstVisit) {
      setHasBeenSeen(false);
      // Auto-show on first visit with a slight delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setHasBeenSeen(true);
    }
  }, [feature, showOnFirstVisit]);

  const handleShow = () => {
    setIsVisible(true);
    trackEvent('', 'feature_tooltip_shown', 1, { feature });
  };

  const handleHide = () => {
    setIsVisible(false);
    if (!hasBeenSeen) {
      const seenKey = `tooltip_seen_${feature}`;
      localStorage.setItem(seenKey, 'true');
      setHasBeenSeen(true);
      trackEvent('', 'feature_tooltip_dismissed', 1, { feature });
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-700';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-700';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-700';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-700';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-700';
    }
  };

  const triggerProps = trigger === 'hover' ? {
    onMouseEnter: handleShow,
    onMouseLeave: handleHide
  } : trigger === 'click' ? {
    onClick: handleShow
  } : {};

  return (
    <div className="relative inline-block">
      <div {...triggerProps}>
        {children}
      </div>
      
      {/* Help icon for discovered features */}
      {hasBeenSeen && trigger !== 'auto' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShow}
          className="absolute -top-1 -right-1 h-5 w-5 p-0 text-blue-400 hover:text-blue-300"
        >
          <HelpCircle className="w-3 h-3" />
        </Button>
      )}

      {/* Tooltip */}
      {isVisible && (
        <div className={`absolute z-50 ${getPositionClasses()}`}>
          <Card className="bg-slate-700 border-slate-600 shadow-xl max-w-xs animate-scale-in">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-white font-medium text-sm">{title}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHide}
                  className="h-4 w-4 p-0 text-slate-400 hover:text-white ml-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{description}</p>
              
              {!hasBeenSeen && (
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={handleHide}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    Got it!
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Arrow */}
          <div 
            className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
          />
        </div>
      )}
    </div>
  );
};

export default FeatureTooltip;