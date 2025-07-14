import { useNameEffects } from '@/hooks/useNameEffects';
import { StandardText } from '@/components/ui';

interface StyledUsernameProps {
  userId: string;
  username: string;
  className?: string;
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  as?: "p" | "span" | "div" | "label";
}

export function StyledUsername({ 
  userId, 
  username, 
  className,
  size = "base",
  weight = "normal",
  as = "span"
}: StyledUsernameProps) {
  const { getNameStyle, loading } = useNameEffects(userId);

  if (loading) {
    return (
      <StandardText size={size} weight={weight} as={as} className={className}>
        {username}
      </StandardText>
    );
  }

  const customStyle = getNameStyle();

  return (
    <StandardText 
      size={size} 
      weight={weight} 
      as={as}
      className={className}
      style={customStyle}
    >
      {username}
    </StandardText>
  );
}