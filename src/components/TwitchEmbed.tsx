
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Twitch } from "lucide-react";

function getTwitchParent() {
  return window.location.hostname;
}

function getStreamEmbed(channel: string) {
  const parent = getTwitchParent();
  return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&muted=true&autoplay=false`;
}

function getChatEmbed(channel: string) {
  const parent = getTwitchParent();
  return `https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?parent=${parent}`;
}

export default function TwitchEmbed() {
  const [enabled, setEnabled] = useState(false);
  const [channel, setChannel] = useState("");
  const [showChat, setShowChat] = useState(true); // Always true for now, can be configurable
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTwitch() {
      setLoading(true);
      const { data } = await supabase
        .from("app_settings")
        .select("twitch_embed_enabled, twitch_channel")
        .limit(1)
        .maybeSingle();

      if (data?.twitch_embed_enabled && data.twitch_channel) {
        setEnabled(true);
        setChannel(data.twitch_channel);
      }
      setLoading(false);
    }
    fetchTwitch();
  }, []);

  if (loading) return <div className="w-full flex justify-center items-center py-16"><span className="text-white">Loading Twitch stream...</span></div>;
  if (!enabled || !channel) {
    return null; // Show nothing if not enabled (full-width section will collapse)
  }

  return (
    <Card className="bg-slate-900 border-purple-900/40 shadow flex flex-col items-center p-4 w-full">
      <div className="w-full flex flex-col md:flex-row gap-6 justify-center items-center">
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          <div className="w-full rounded-lg overflow-hidden flex justify-center">
            <iframe
              src={getStreamEmbed(channel)}
              frameBorder="0"
              allowFullScreen
              scrolling="no"
              height={420}
              width="100%"
              className="rounded-lg bg-slate-950"
              title="Twitch Stream"
            />
          </div>
        </div>
        {/* Show chat on right for md+ screens, below for mobile */}
        <div className="flex-1 w-full max-w-md">
          {showChat && (
            <iframe
              id="chat_embed"
              src={getChatEmbed(channel)}
              height="420"
              width="100%"
              className="rounded-lg bg-slate-950 border mt-4 md:mt-0"
              title="Twitch Chat"
            />
          )}
        </div>
      </div>
      <div className="mt-2 text-purple-300 flex items-center gap-2">
        <Twitch className="w-6 h-6" /> <span className="font-bold text-lg">{channel}</span>
      </div>
    </Card>
  );
}
