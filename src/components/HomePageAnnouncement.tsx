
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function HomePageAnnouncement() {
  const [announcement, setAnnouncement] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncement() {
      // Get the setting row to see if an announcement ID is set
      const { data: settings } = await supabase
        .from("app_settings")
        .select("announcement_id")
        .limit(1)
        .maybeSingle();

      if (!settings?.announcement_id) {
        setAnnouncement(null);
        setLoading(false);
        return;
      }
      // Get the announcement details by ID
      const { data: ann } = await supabase
        .from("announcements")
        .select("title,content")
        .eq("id", settings.announcement_id)
        .maybeSingle();

      if (ann) {
        setAnnouncement({ title: ann.title, content: ann.content });
      } else {
        setAnnouncement(null);
      }
      setLoading(false);
    }

    fetchAnnouncement();
  }, []);

  if (loading) return null;

  if (!announcement) return (
    <Card className="bg-slate-800 border-yellow-800/40 shadow mb-4 p-4">
      <div className="text-center text-sm text-slate-400">No announcement</div>
    </Card>
  );

  return (
    <Card className="bg-yellow-800/20 border-yellow-800/50 shadow mb-4 p-4">
      <div className="flex gap-2 items-center mb-2">
        <Badge className="bg-yellow-600/30 border-yellow-600/40 text-yellow-300 text-sm">Announcement</Badge>
        <span className="font-bold text-yellow-200">{announcement.title}</span>
      </div>
      <div className="text-slate-200">{announcement.content}</div>
    </Card>
  );
}
