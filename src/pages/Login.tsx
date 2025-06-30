
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex flex-col items-center justify-center">
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-800/90 border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Sign In</CardTitle>
            <CardDescription className="text-slate-300">
              Sign-in securely with Discord to access the TLR Skirmish Hub, once signed-in - you'll be prompted for your Riot ID.<p>Please ensure you enter it correctly (name#tag) to avoid any issues.</p> 
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Button 
              onClick={handleDiscordLogin}
              disabled={discordLoading}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {discordLoading ? 'Connecting...' : 'Login with Discord'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
