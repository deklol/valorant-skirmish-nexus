
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RiotIdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const RiotIdDialog = ({ open, onOpenChange, onComplete }: RiotIdDialogProps) => {
  const [riotId, setRiotId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const validateRiotId = (id: string) => {
    const riotIdPattern = /^.+#[A-Za-z0-9]{3,5}$/;
    return riotIdPattern.test(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRiotId(riotId)) {
      toast({
        title: "Invalid Riot ID",
        description: "Please enter a valid Riot ID (e.g., PlayerName#1234)",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Updating Riot ID for user:', user.id);
      
      // Update user's riot_id and discord info
      const { error: updateError } = await supabase
        .from('users')
        .update({
          riot_id: riotId,
          discord_id: user.user_metadata?.provider_id,
          discord_username: user.user_metadata?.full_name,
          riot_id_last_updated: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Riot ID updated successfully, calling scrape function...');

      // Call edge function to scrape rank data
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('scrape-rank', {
        body: { riot_id: riotId, user_id: user.id }
      });

      if (scrapeError) {
        console.error('Rank scraping failed:', scrapeError);
        // Don't block the user if scraping fails
        toast({
          title: "Profile Updated",
          description: "Your Riot ID has been saved. Rank data may take a moment to update.",
        });
      } else {
        console.log('Scrape result:', scrapeData);
        toast({
          title: "Profile Updated",
          description: scrapeData?.message || "Your Riot ID has been saved and rank data updated successfully.",
        });
      }

      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-slate-300">
            Please enter your Riot ID to complete your profile setup and get your current rank.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="riotId" className="text-slate-200">
              Riot ID (e.g., PlayerName#1234)
            </Label>
            <Input
              id="riotId"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              placeholder="Enter your Riot ID"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
            <p className="text-xs text-slate-400">
              Your Riot ID includes your username and tag (e.g., TestUser#ABC12)
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Saving...' : 'Save Riot ID'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RiotIdDialog;
