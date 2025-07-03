import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ClickableTeamNameProps {
  teamId: string;
  teamName: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'link';
}

const ClickableTeamName = ({ teamId, teamName, className = '', variant = 'link' }: ClickableTeamNameProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/team/${teamId}`);
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={`p-0 h-auto font-normal text-blue-400 hover:text-blue-300 hover:underline ${className}`}
    >
      {teamName}
    </Button>
  );
};

export default ClickableTeamName;