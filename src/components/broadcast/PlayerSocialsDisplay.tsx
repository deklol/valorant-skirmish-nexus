import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, Twitter, Twitch } from "lucide-react";

interface PlayerSocialsDisplayProps {
  player: any;
  className?: string;
}

export default function PlayerSocialsDisplay({ 
  player, 
  className = "" 
}: PlayerSocialsDisplayProps) {
  const socials = [];

  // Twitter
  if (player.users.twitter_handle) {
    socials.push({
      platform: 'Twitter',
      handle: player.users.twitter_handle,
      url: `https://twitter.com/${player.users.twitter_handle.replace('@', '')}`,
      icon: <Twitter className="w-4 h-4" />,
      color: 'bg-blue-500 hover:bg-blue-600'
    });
  }

  // Twitch
  if (player.users.twitch_handle) {
    socials.push({
      platform: 'Twitch',
      handle: player.users.twitch_handle,
      url: `https://twitch.tv/${player.users.twitch_handle}`,
      icon: <Twitch className="w-4 h-4" />,
      color: 'bg-purple-500 hover:bg-purple-600'
    });
  }

  if (socials.length === 0) return null;

  return (
    <Card className={`bg-black/40 backdrop-blur border-white/20 p-4 ${className}`}>
      <h4 className="text-lg font-semibold text-white mb-3 text-center">Follow {player.users.discord_username}</h4>
      
      <div className="space-y-2">
        {socials.map((social, index) => (
          <Button
            key={index}
            variant="ghost"
            className={`${social.color} text-white w-full justify-between hover:scale-105 transition-all duration-200`}
            onClick={() => window.open(social.url, '_blank')}
          >
            <div className="flex items-center space-x-2">
              {social.icon}
              <span>{social.platform}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-sm">@{social.handle}</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
}