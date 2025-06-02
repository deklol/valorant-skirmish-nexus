
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import RiotIdDialog from './RiotIdDialog';

const RiotIdSetupManager = () => {
  const { needsRiotIdSetup, user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Show dialog when user needs Riot ID setup
    if (needsRiotIdSetup && user) {
      setShowDialog(true);
    }
  }, [needsRiotIdSetup, user]);

  const handleComplete = async () => {
    setShowDialog(false);
    // Force a profile refetch by triggering a re-render
    window.location.reload();
  };

  if (!user || !needsRiotIdSetup) {
    return null;
  }

  return (
    <RiotIdDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      onComplete={handleComplete}
    />
  );
};

export default RiotIdSetupManager;
