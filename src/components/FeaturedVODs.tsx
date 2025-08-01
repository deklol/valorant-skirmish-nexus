import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardHeading } from "@/components/ui/standard-heading";
import { StandardText } from "@/components/ui/standard-text";
import { StandardBadge } from "@/components/ui/standard-badge";
import { Button } from "@/components/ui/button";
import { Video, Play, ExternalLink, Star } from "lucide-react";
import { VODModal } from "@/components/VODModal";

interface VOD {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  tournament_id: string | null;
  casters: string[] | null;
  production_team: string[] | null;
  video_platform: string;
  embed_id: string | null;
  duration_minutes: number | null;
  view_count: number;
  is_featured: boolean;
  created_at: string;
  tournaments?: {
    id: string;
    name: string;
    status: string;
    start_time: string;
  } | null;
}

interface FeaturedVODsProps {
  tournamentId: string;
}

export default function FeaturedVODs({ tournamentId }: FeaturedVODsProps) {
  const [featuredVods, setFeaturedVods] = useState<VOD[]>([]);
  const [selectedVod, setSelectedVod] = useState<VOD | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedVods();
  }, [tournamentId]);

  const fetchFeaturedVods = async () => {
    try {
      const { data, error } = await supabase
        .from("vods")
        .select(`
          *,
          tournaments (
            id,
            name,
            status,
            start_time
          )
        `)
        .eq("tournament_id", tournamentId)
        .eq("is_featured", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeaturedVods(data || []);
    } catch (error) {
      console.error("Error fetching featured VODs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "Unknown";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading || featuredVods.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-600/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            <StandardHeading level="h2" className="text-foreground">Featured VODs</StandardHeading>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {featuredVods.map((vod) => (
              <div key={vod.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                <div className="flex flex-col md:flex-row">
                  {vod.thumbnail_url && (
                    <div className="relative md:w-64 aspect-video bg-muted md:shrink-0">
                      <img
                        src={vod.thumbnail_url}
                        alt={vod.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                      <div className="absolute top-2 left-2">
                        <StandardBadge status="warning" className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </StandardBadge>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 space-y-3 flex-1">
                    <StandardHeading level="h4" className="text-card-foreground line-clamp-2">
                      {vod.title}
                    </StandardHeading>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>{formatDuration(vod.duration_minutes)}</span>
                      </div>
                      <StandardBadge status="info" className="bg-slate-500/20 text-slate-300 border-slate-400/30">
                        {vod.video_platform}
                      </StandardBadge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedVod(vod)}
                        size="sm"
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Watch
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(vod.video_url, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedVod && (
        <VODModal
          vod={selectedVod}
          isOpen={!!selectedVod}
          onClose={() => setSelectedVod(null)}
        />
      )}
    </>
  );
}