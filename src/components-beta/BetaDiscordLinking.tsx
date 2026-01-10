import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Unlink, Link, CheckCircle } from 'lucide-react';
import { GlassCard, BetaButton, BetaBadge } from './ui-beta';

interface BetaDiscordLinkingProps {
  className?: string;
}

const BetaDiscordLinking: React.FC<BetaDiscordLinkingProps> = ({ className }) => {
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
          redirectTo: `${window.location.origin}/beta/settings?discord_linked=true`
        }
      });

      if (error) {
        throw error;
      }

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
    <GlassCard className={`p-6 ${className || ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Discord Integration</h3>
      </div>

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
                  <span className="text-[hsl(var(--beta-text-primary))] font-medium">
                    {profile?.discord_username}
                  </span>
                  <BetaBadge variant="success" size="sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </BetaBadge>
                </div>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  Discord account linked successfully
                </p>
              </div>
            </>
          ) : (
            <div>
              <span className="text-[hsl(var(--beta-text-primary))] font-medium">Discord Account</span>
              <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                Connect your Discord account to participate in tournaments
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {isDiscordLinked ? (
            <BetaButton
              variant="outline"
              size="sm"
              onClick={handleUnlinkDiscord}
              disabled={unlinking}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Unlink className="w-4 h-4 mr-2" />
              {unlinking ? 'Unlinking...' : 'Unlink'}
            </BetaButton>
          ) : (
            <BetaButton
              onClick={handleLinkDiscord}
              disabled={linking}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Link className="w-4 h-4 mr-2" />
              {linking ? 'Linking...' : 'Link Discord'}
            </BetaButton>
          )}
        </div>
      </div>

      {!isDiscordLinked && (
        <div className="mt-4 p-4 rounded-xl bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))]">
          <h4 className="text-[hsl(var(--beta-text-primary))] font-medium mb-2">Why link Discord?</h4>
          <div className="text-sm text-[hsl(var(--beta-text-muted))] space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[hsl(var(--beta-success))]" />
              <span>Participate in Discord tournaments</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[hsl(var(--beta-success))]" />
              <span>Quick signup for matches via Discord bot</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[hsl(var(--beta-success))]" />
              <span>Tournament notifications and updates</span>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export { BetaDiscordLinking };
