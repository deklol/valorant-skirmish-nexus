
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import RiotIdDialog from './RiotIdDialog';

const RiotIdSetupManager = () => {
  const { user, profile, needsRiotIdSetup, refreshProfile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user && profile && needsRiotIdSetup) {
      setIsDialogOpen(true);
    } else {
      setIsDialogOpen(false);
    }
  }, [user, profile, needsRiotIdSetup]);

  const handleComplete = async () => {
    await refreshProfile();
    setIsDialogOpen(false);
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <RiotIdDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      onComplete={handleComplete}
    />
  );
};

export default RiotIdSetupManager;
