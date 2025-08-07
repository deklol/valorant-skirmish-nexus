import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Play, Star, ExternalLink } from "lucide-react";
import { VODModal } from "@/components/VODModal";

interface VOD {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  view_count: number;
  is_featured: boolean;
  created_at: string;
}

const HomeVODSpotlight = () => {
  const [vods, setVods] = useState<VOD[]>([]);
  const [selected, setSelected] = useState<VOD | null>(null);

  useEffect(() => {
    const fetchVods = async () => {
      const { data, error } = await supabase
        .from("vods")
        .select("id,title,video_url,thumbnail_url,view_count,is_featured,created_at")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      if (!error) setVods(data || []);
    };
    fetchVods();
  }, []);

  if (!vods.length) return null;

  return (
    <section aria-labelledby="vod-spotlight">
      <Card className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-600/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="vod-spotlight" className="text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" /> VOD Spotlight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea>
            <div className="flex gap-4 pb-2">
              {vods.map((v) => (
                <div key={v.id} className="w-[280px] shrink-0 rounded-lg border border-slate-700 bg-slate-800/60 overflow-hidden">
                  <div className="relative aspect-video bg-slate-900">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt={`${v.title} thumbnail`} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-slate-400">No thumbnail</div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity grid place-items-center">
                      <Play className="w-10 h-10 text-white" />
                    </div>
                    {v.is_featured && (
                      <div className="absolute top-2 left-2 text-xs rounded bg-yellow-500/20 text-yellow-200 border border-yellow-400/30 px-2 py-0.5">
                        Featured
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="line-clamp-2 text-white text-sm font-medium">{v.title}</div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setSelected(v)}>
                        <Play className="w-4 h-4 mr-1" /> Watch
                      </Button>
                      <Button size="sm" variant="outline" className="border-slate-600" onClick={() => window.open(v.video_url, "_blank") }>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {selected && (
        <VODModal vod={selected as any} isOpen={!!selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
};

export default HomeVODSpotlight;
