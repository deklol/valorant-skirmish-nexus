import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Pause, Play, StopCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BatchResult {
  user_id: string;
  username: string;
  riot_id: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  oldRank?: string;
  newRank?: string;
  oldWeight?: number;
  newWeight?: number;
}

interface BatchRankRefreshButtonProps {
  onRefreshComplete?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const BatchRankRefreshButton = ({
  onRefreshComplete,
  variant = 'default',
  size = 'default',
  className = ''
}: BatchRankRefreshButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState('');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { toast } = useToast();

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Update time remaining estimate
  useEffect(() => {
    if (isProcessing && !isPaused && totalUsers > 0) {
      const remainingUsers = totalUsers - results.length;
      const estimatedSeconds = remainingUsers * 3; // 3 seconds per user
      setTimeRemaining(estimatedSeconds);
    }
  }, [results.length, totalUsers, isProcessing, isPaused]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  const revertRanks = async (resultsToRevert: BatchResult[]) => {
    const successfulUpdates = resultsToRevert.filter(r => r.status === 'success' && (r.oldRank !== r.newRank || r.oldWeight !== r.newWeight));
    
    for (const result of successfulUpdates) {
      try {
        await supabase
          .from('users')
          .update({
            current_rank: result.oldRank,
            weight_rating: result.oldWeight
          })
          .eq('id', result.user_id);
      } catch (error: any) {
        console.error(`Failed to revert rank for user ${result.user_id}:`, error);
        toast({
          title: "Revert Failed",
          description: `Failed to revert rank for ${result.username}`,
          variant: "destructive",
        });
      }
    }
  };

  const refreshAllRanks = async () => {
    setIsProcessing(true);
    setIsPaused(false);
    setIsCancelled(false);
    setProgress(0);
    setResults([]);
    setIsOpen(true);
    
    try {
      // Fetch all users with riot_id
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, discord_username, riot_id, current_rank, weight_rating')
        .not('riot_id', 'is', null)
        .neq('riot_id', '');
      
      if (fetchError) {
        throw new Error(`Failed to fetch users: ${fetchError.message}`);
      }

      if (!users || users.length === 0) {
        toast({
          title: "No Users Found",
          description: "No users with Riot IDs found to refresh.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      setTotalUsers(users.length);
      const newResults: BatchResult[] = [];

      for (let i = 0; i < users.length; i++) {
        // Check for cancellation
        if (isCancelled) {
          await revertRanks(newResults);
          toast({
            title: "Batch Refresh Cancelled",
            description: "Changes have been reverted.",
          });
          break;
        }

        // Wait if paused
        while (isPaused && !isCancelled) {
          await sleep(1000);
        }

        // Double-check cancellation after pause
        if (isCancelled) {
          await revertRanks(newResults);
          toast({
            title: "Batch Refresh Cancelled",
            description: "Changes have been reverted.",
          });
          break;
        }

        const user = users[i];
        setCurrentUser(user.discord_username || user.riot_id);
        setProgress(((i + 1) / users.length) * 100);

        try {
          // Call the scrape-rank function
          const { data, error } = await supabase.functions.invoke('scrape-rank', {
            body: {
              riot_id: user.riot_id,
              user_id: user.id
            }
          });

          if (error) {
            newResults.push({
              user_id: user.id,
              username: user.discord_username || 'Unknown',
              riot_id: user.riot_id,
              status: 'error',
              message: error.message || 'Unknown error'
            });
          } else if (data.current_rank === 'Unrated') {
            // Skip Unrated results to prevent incorrect updates
            newResults.push({
              user_id: user.id,
              username: user.discord_username || 'Unknown',
              riot_id: user.riot_id,
              status: 'skipped',
              message: 'Unrated result skipped to prevent incorrect update'
            });
          } else {
            const hadRankChange = data.current_rank !== user.current_rank;
            const hadWeightChange = data.weight_rating !== user.weight_rating;
           
            newResults.push({
              user_id: user.id,
              username: user.discord_username || 'Unknown',
              riot_id: user.riot_id,
              status: 'success',
              message: hadRankChange || hadWeightChange
                ? `Rank updated${data.peak_rank_updated ? ' (Peak also updated)' : ''}`
                : 'No changes',
              oldRank: user.current_rank,
              newRank: data.current_rank,
              oldWeight: user.weight_rating,
              newWeight: data.weight_rating
            });
          }
        } catch (error: any) {
          newResults.push({
            user_id: user.id,
            username: user.discord_username || 'Unknown',
            riot_id: user.riot_id,
            status: 'error',
            message: error.message || 'Network error'
          });
        }
        setResults([...newResults]);
       
        // Add 3-second delay between requests to avoid rate limiting
        if (i < users.length - 1 && !isCancelled) {
          await sleep(3000);
        }
      }

      if (!isCancelled) {
        toast({
          title: "Batch Refresh Complete",
          description: `Processed ${users.length} users. ${newResults.filter(r => r.status === 'success').length} successful, ${newResults.filter(r => r.status === 'error').length} failed, ${newResults.filter(r => r.status === 'skipped').length} skipped.`,
        });

        if (onRefreshComplete) {
          onRefreshComplete();
        }
      }
    } catch (error: any) {
      console.error('Error in batch refresh:', error);
      toast({
        title: "Batch Refresh Failed",
        description: error.message || "Failed to start batch refresh",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setCurrentUser('');
      setIsPaused(false);
      setIsCancelled(false);
    }
  };

  const handlePausePlay = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? "Batch Refresh Resumed" : "Batch Refresh Paused",
      description: isPaused ? "Processing has been resumed." : "Processing has been paused.",
    });
  };

  const handleCancel = async () => {
    setIsCancelled(true);
    setIsPaused(false);
    // Reversion is handled in the main loop
  };

  const getStatusIcon = (status: 'success' | 'error' | 'skipped') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'error' | 'skipped') => {
    const variants = {
      success: 'default',
      error: 'destructive',
      skipped: 'secondary'
    } as const;
   
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const hasRankChange = (result: BatchResult) => {
    return result.oldRank !== result.newRank || result.oldWeight !== result.newWeight;
  };

  return (
    <>
      <Button
        onClick={refreshAllRanks}
        disabled={isProcessing}
        variant={variant}
        size={size}
        className={className}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
        Batch Refresh All Ranks
      </Button>
      <Dialog open={isOpen} onOpenChange={isOpen => { 
        if (!isProcessing) setIsOpen(isOpen);
        if (!isOpen && isCancelled) setResults([]);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Batch Rank Refresh Progress</DialogTitle>
          </DialogHeader>
         
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {Math.round(progress)}%</span>
                <span>{results.length} / {totalUsers} completed</span>
              </div>
              <Progress value={progress} className="w-full" />
              {isProcessing && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <p>Currently processing: {currentUser}</p>
                  <p>Est. time remaining: {formatTimeRemaining(timeRemaining)}</p>
                </div>
              )}
            </div>
            {isProcessing && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePausePlay}
                  disabled={isCancelled}
                >
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isCancelled}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
            {results.length > 0 && (
              <div className="space-y-2">
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">
                    ✓ Success: {results.filter(r => r.status === 'success').length}
                  </span>
                  <span className="text-red-600">
                    ✗ Failed: {results.filter(r => r.status === 'error').length}
                  </span>
                  <span className="text-yellow-600">
                    ⚠ Skipped: {results.filter(r => r.status === 'skipped').length}
                  </span>
                  <span className="text-yellow-600">
                    ↻ Changes: {results.filter(r => hasRankChange(r) && r.status === 'success').length}
                  </span>
                </div>
               
                <ScrollArea className="h-64 border rounded-md p-2">
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div
                        key={result.user_id}
                        className="flex items-start gap-2 p-2 border rounded text-sm"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(result.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">
                              {result.username}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              ({result.riot_id})
                            </span>
                            {getStatusBadge(result.status)}
                          </div>
                          <p className="text-muted-foreground">{result.message}</p>
                          {hasRankChange(result) && result.status === 'success' && (
                            <div className="mt-1 text-xs">
                              {result.oldRank !== result.newRank && (
                                <div>Rank: {result.oldRank || 'None'} → {result.newRank || 'None'}</div>
                              )}
                              {result.oldWeight !== result.newWeight && (
                                <div>Weight: {result.oldWeight || 0} → {result.newWeight || 0}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            {!isProcessing && results.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BatchRankRefreshButton;