
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Twitch } from "lucide-react";

function getTwitchEmbed(channel: string) {
  // Official Twitch embed format
  const parent = window.location.hostname;
  return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&muted=true&autoplay=false`;
}

export default function TwitchEmbed() {
  const [enabled, setEnabled] = useState(false);
  const [channel, setChannel] = useState("");
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
    return (
      <Card className="bg-slate-800 border-yellow-800/40 shadow flex flex-col items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-2 py-12">
          <Twitch className="w-10 h-10 text-purple-400" />
          <div className="text-slate-400">Twitch embed is not enabled.</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-purple-900/40 shadow flex flex-col items-center py-4">
      <div className="w-full flex justify-center items-center mb-2">
        <Twitch className="w-8 h-8 text-purple-400 mr-2" />
        <span className="font-bold text-purple-200 text-lg">{channel}</span>
      </div>
      <div className="w-full rounded-lg overflow-hidden flex justify-center">
        <iframe
          src={getTwitchEmbed(channel)}
          frameBorder="0"
          allowFullScreen
          scrolling="no"
          height={380}
          width="100%"
          className="rounded-lg bg-slate-950"
          title="Twitch Stream"
        />
      </div>
    </Card>
  );
}
