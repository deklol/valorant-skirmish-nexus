
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import RiotIdDialog from './RiotIdDialog';

const RiotIdSetupManager = () => {
  const { user, profile, needsRiotIdSetup } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user && profile && needsRiotIdSetup) {
      console.log('User needs Riot ID setup, opening dialog');
      setIsDialogOpen(true);
    } else {
      console.log('Riot ID setup not needed or user/profile not loaded');
      setIsDialogOpen(false);
    }
  }, [user, profile, needsRiotIdSetup]);

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  const handleSave = () => {
    setIsDialogOpen(false);
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <RiotIdDialog
      isOpen={isDialogOpen}
      onClose={handleClose}
      onSave={handleSave}
      currentRiotId={profile.riot_id || ''}
    />
  );
};

export default RiotIdSetupManager;
