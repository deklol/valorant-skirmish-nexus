
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Username } from '@/components/Username';

interface ClickableUsernameProps {
  userId: string;
  username: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'link';
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
}

const ClickableUsername = ({ 
  userId, 
  username, 
  className = '', 
  variant = 'link',
  size = "base",
  weight = "normal"
}: ClickableUsernameProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/profile/${userId}`);
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={`p-0 h-auto font-normal text-blue-400 hover:text-blue-300 hover:underline ${className}`}
    >
      <Username 
        userId={userId} 
        username={username} 
        size={size} 
        weight={weight}
        as="span"
      />
    </Button>
  );
};

export default ClickableUsername;

