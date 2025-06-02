
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import RiotIdDialog from './RiotIdDialog';

const RiotIdSetupManager = () => {
  const { needsRiotIdSetup, user, loading } = useAuth();
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Only show dialog when not loading and user needs setup
    if (!loading && needsRiotIdSetup && user) {
      console.log('Showing Riot ID setup dialog');
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [needsRiotIdSetup, user, loading]);

  const handleComplete = () => {
    console.log('Riot ID setup completed');
    setShowDialog(false);
  };

  if (loading || !user || !needsRiotIdSetup) {
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
