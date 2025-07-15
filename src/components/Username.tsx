import { useNameEffects, getNameEffectStyles } from '@/hooks/useNameEffects';
import { StandardText } from '@/components/ui';
import { cn } from '@/lib/utils';

interface UsernameProps {
  userId?: string;
  username: string;
  className?: string;
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  as?: "p" | "span" | "div" | "label";
  fallbackOnly?: boolean; // For critical UI areas where effects might cause issues
}

export function Username({ 
  userId, 
  username, 
  className,
  size = "base",
  weight = "normal",
  as = "span",
  fallbackOnly = false
}: UsernameProps) {
  const { nameEffect, loading } = useNameEffects(userId || null);

  // If fallbackOnly is true, no userId, loading, or no effect, just render plain username
  if (fallbackOnly || !userId || loading || !nameEffect) {
    return (
      <StandardText size={size} weight={weight} as={as} className={className}>
        {username}
      </StandardText>
    );
  }

  const effectClasses = getNameEffectStyles({ effect_data: nameEffect });

  return (
    <StandardText 
      size={size} 
      weight={weight} 
      as={as}
      className={cn(effectClasses, className)}
    >
      {username}
    </StandardText>
  );
}

// Export StyledUsername for backwards compatibility during transition
export { Username as StyledUsername };