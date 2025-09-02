import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Unlink, Link, CheckCircle } from 'lucide-react';

interface DiscordLinkingProps {
  className?: string;
}

const DiscordLinking: React.FC<DiscordLinkingProps> = ({ className }) => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const isDiscordLinked = profile?.discord_id && profile?.discord_username;

  const handleLinkDiscord = async () => {
    if (!user) return;

    setLinking(true);
    try {
      // Start Discord OAuth flow with account linking
      const { error } = await supabase.auth.linkIdentity({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/profile?discord_linked=true`
        }
      });

      if (error) {
        throw error;
      }

      // The OAuth flow will handle the redirect
      toast({
        title: "Redirect",
        description: "Redirecting to Discord for authentication...",
      });
    } catch (error: any) {
      console.error('Error linking Discord:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link Discord account",
        variant: "destructive",
      });
      setLinking(false);
    }
  };

  const handleUnlinkDiscord = async () => {
    if (!user) return;

    setUnlinking(true);
    try {
      // Clear Discord information from profile
      const { error } = await supabase
        .from('users')
        .update({
          discord_id: null,
          discord_username: null,
          discord_avatar_url: null
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      
      toast({
        title: "Success",
        description: "Discord account unlinked successfully",
      });
    } catch (error: any) {
      console.error('Error unlinking Discord:', error);
      toast({
        title: "Error",
        description: "Failed to unlink Discord account",
        variant: "destructive",
      });
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <Card className={`bg-slate-800 border-slate-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          Discord Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDiscordLinked ? (
              <>
                {profile?.discord_avatar_url && (
                  <img 
                    src={profile.discord_avatar_url} 
                    alt="Discord Avatar" 
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {profile?.discord_username}
                    </span>
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">
                    Discord account linked successfully
                  </p>
                </div>
              </>
            ) : (
              <div>
                <span className="text-white font-medium">Discord Account</span>
                <p className="text-sm text-slate-400">
                  Connect your Discord account to participate in tournaments
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {isDiscordLinked ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUnlinkDiscord}
                disabled={unlinking}
              >
                <Unlink className="w-4 h-4 mr-2" />
                {unlinking ? 'Unlinking...' : 'Unlink'}
              </Button>
            ) : (
              <Button
                onClick={handleLinkDiscord}
                disabled={linking}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Link className="w-4 h-4 mr-2" />
                {linking ? 'Linking...' : 'Link Discord'}
              </Button>
            )}
          </div>
        </div>

        {!isDiscordLinked && (
          <div className="bg-slate-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Why link Discord?</h4>
            <div className="text-sm text-slate-300 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Participate in Discord tournaments</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Quick signup for matches via Discord bot</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Tournament notifications and updates</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscordLinking;