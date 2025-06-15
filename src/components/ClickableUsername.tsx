
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ClickableUsernameProps {
  userId: string;
  username: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'link';
}

const ClickableUsername = ({ userId, username, className = '', variant = 'link' }: ClickableUsernameProps) => {
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
      {username}
    </Button>
  );
};

export default ClickableUsername;

