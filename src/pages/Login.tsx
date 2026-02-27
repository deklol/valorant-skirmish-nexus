
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';

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
    // Don't set loading to false here as the user will be redirected
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="relative flex flex-col items-center gap-4">
          <div className="absolute inset-0 blur-3xl opacity-20 bg-[hsl(var(--beta-accent))] rounded-full scale-150 -z-10" />
          <img
            src="/images/tlr-logo.png"
            alt="TLR Logo"
            className="w-24 h-24 object-contain drop-shadow-[0_0_20px_hsl(var(--beta-accent)/0.4)]"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome Back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to the TLR Skirmish Hub</p>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="w-full rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-6 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4">
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p><strong className="text-foreground">Sign in securely with Discord</strong> to access the TLR Skirmish Hub. Once signed in, you'll be prompted for your Riot ID.</p>
              <p className="text-xs text-muted-foreground/70">Please ensure you enter it correctly (name#tag) to avoid any issues.</p>
            </div>

            <Button
              onClick={handleDiscordLogin}
              disabled={discordLoading}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium h-11 text-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#5865F2]/20"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {discordLoading ? 'Connecting...' : 'Login with Discord'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
