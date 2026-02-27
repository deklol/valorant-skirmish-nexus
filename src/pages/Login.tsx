
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { GlassCard } from '@/components-beta/ui-beta/GlassCard';
import { BetaButton } from '@/components-beta/ui-beta/BetaButton';
import { MessageSquare } from 'lucide-react';
import "@/styles/beta-tokens.css";

const Login = () => {
  const [discordLoading, setDiscordLoading] = useState(false);
  const { signInWithDiscord } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDiscordLogin = async () => {
    setDiscordLoading(true);

    const { error } = await signInWithDiscord();

    if (error) {
      toast({
        title: "Discord Login Failed",
        description: error.message,
        variant: "destructive",
      });
      setDiscordLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 relative">
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-72 h-72 rounded-full bg-[hsl(var(--beta-accent)/0.06)] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-8 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/images/tlr-logo.png"
            alt="TLR Logo"
            className="w-24 h-24 object-contain drop-shadow-[0_0_20px_hsl(var(--beta-accent)/0.3)]"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm text-[hsl(var(--beta-text-secondary))] mt-1">
              Sign in to the TLR Skirmish Hub
            </p>
          </div>
        </div>

        {/* Sign-in card */}
        <GlassCard variant="strong" className="w-full">
          <div className="flex flex-col gap-4">
            <div className="text-center text-sm text-[hsl(var(--beta-text-secondary))] flex flex-col gap-2">
              <p>
                <strong className="text-[hsl(var(--beta-text-primary))]">Sign in securely with Discord</strong> to access the TLR Skirmish Hub. Once signed in, you'll be prompted for your Riot ID.
              </p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                Please ensure you enter it correctly (name#tag) to avoid any issues.
              </p>
            </div>

            <BetaButton
              onClick={handleDiscordLogin}
              disabled={discordLoading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              <MessageSquare className="w-4 h-4" />
              {discordLoading ? 'Connecting...' : 'Login with Discord'}
            </BetaButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Login;
